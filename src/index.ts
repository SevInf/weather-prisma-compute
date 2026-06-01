import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";

const TILES_PATH = resolve("data/germany.pmtiles");
const FRONTEND_DIST = "./frontend/dist";

const app = new Hono();

// Serve the .pmtiles archive with HTTP Range support.
// MapLibre's pmtiles client issues range requests to read the header,
// directory and individual tiles out of the single archive file.
app.on(["GET", "HEAD"], "/tiles/germany.pmtiles", async (c) => {
  let info;
  try {
    info = await stat(TILES_PATH);
  } catch {
    return c.text("germany.pmtiles not found. Run the extract step first.", 404);
  }

  const size = info.size;
  const etag = `"${size.toString(16)}-${info.mtimeMs.toString(16)}"`;
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Accept-Ranges": "bytes",
    "ETag": etag,
    "Last-Modified": new Date(info.mtimeMs).toUTCString(),
    "Cache-Control": "public, max-age=3600",
    // pmtiles.js fetches from a different origin during dev (vite on :5173).
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Range, If-None-Match, If-Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, ETag, Accept-Ranges",
  };

  const file = Bun.file(TILES_PATH);
  const range = c.req.header("range");

  if (!range) {
    if (c.req.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { ...baseHeaders, "Content-Length": size.toString() },
      });
    }
    return new Response(file, {
      status: 200,
      headers: { ...baseHeaders, "Content-Length": size.toString() },
    });
  }

  // Parse a single-range "bytes=start-end" request. Multi-range responses
  // (multipart/byteranges) are not required by pmtiles clients.
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) {
    return new Response("Invalid Range header", {
      status: 416,
      headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
    });
  }

  const startStr = match[1];
  const endStr = match[2];
  let start: number;
  let end: number;

  if (startStr === "" && endStr === "") {
    return new Response("Invalid Range header", {
      status: 416,
      headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
    });
  } else if (startStr === "") {
    // Suffix range: last N bytes.
    const suffix = Number.parseInt(endStr, 10);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number.parseInt(startStr, 10);
    end = endStr === "" ? size - 1 : Number.parseInt(endStr, 10);
  }

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start > end ||
    start >= size
  ) {
    return new Response("Range Not Satisfiable", {
      status: 416,
      headers: { ...baseHeaders, "Content-Range": `bytes */${size}` },
    });
  }

  end = Math.min(end, size - 1);
  const length = end - start + 1;

  const rangeHeaders = {
    ...baseHeaders,
    "Content-Range": `bytes ${start}-${end}/${size}`,
    "Content-Length": length.toString(),
  };

  if (c.req.method === "HEAD") {
    return new Response(null, { status: 206, headers: rangeHeaders });
  }

  // Bun.file().slice() returns a Blob with an efficient range read.
  return new Response(file.slice(start, end + 1), {
    status: 206,
    headers: rangeHeaders,
  });
});

// CORS preflight for the tiles endpoint.
app.options("/tiles/germany.pmtiles", (c) =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, If-None-Match, If-Range",
      "Access-Control-Max-Age": "86400",
    },
  }),
);

// Static frontend (built by Vite into frontend/dist).
app.use("/*", serveStatic({ root: FRONTEND_DIST }));
app.get("/", serveStatic({ path: `${FRONTEND_DIST}/index.html` }));
app.notFound((c) => c.text("Not found", 404));

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
};
