import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { resolve } from "node:path";

const TILES_PATH = resolve("data/germany.pmtiles");

// The file is read fresh per request; tile clients always issue Range GETs.
export const dynamic = "force-dynamic";
// Standard Node.js runtime: streams, fs, etc. (the default, named here for clarity).
export const runtime = "nodejs";

function baseHeaders(size: number, mtimeMs: number): Record<string, string> {
  return {
    "Content-Type": "application/octet-stream",
    "Accept-Ranges": "bytes",
    ETag: `"${size.toString(16)}-${mtimeMs.toString(16)}"`,
    "Last-Modified": new Date(mtimeMs).toUTCString(),
    "Cache-Control": "public, max-age=3600",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Range, If-None-Match, If-Range",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, ETag, Accept-Ranges",
  };
}

function streamFile(start: number, end: number): ReadableStream<Uint8Array> {
  // createReadStream's `end` is inclusive (matches HTTP Range semantics).
  const nodeStream = createReadStream(TILES_PATH, { start, end });
  return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
}

async function handle(req: Request, method: "GET" | "HEAD"): Promise<Response> {
  let info;
  try {
    info = await stat(TILES_PATH);
  } catch {
    return new Response(
      "germany.pmtiles not found. Run `bun run extract-tiles` first.",
      { status: 404 },
    );
  }

  const size = info.size;
  const headers = baseHeaders(size, info.mtimeMs);
  const range = req.headers.get("range");

  if (!range) {
    const full = { ...headers, "Content-Length": size.toString() };
    if (method === "HEAD") {
      return new Response(null, { status: 200, headers: full });
    }
    return new Response(streamFile(0, size - 1), { status: 200, headers: full });
  }

  // Parse a single-range "bytes=start-end" request. Multi-range responses
  // (multipart/byteranges) are not required by pmtiles clients.
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) {
    return new Response("Invalid Range header", {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${size}` },
    });
  }

  const [, startStr, endStr] = match;
  let start: number;
  let end: number;

  if (startStr === "" && endStr === "") {
    return new Response("Invalid Range header", {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${size}` },
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
      headers: { ...headers, "Content-Range": `bytes */${size}` },
    });
  }

  end = Math.min(end, size - 1);
  const length = end - start + 1;

  const rangeHeaders = {
    ...headers,
    "Content-Range": `bytes ${start}-${end}/${size}`,
    "Content-Length": length.toString(),
  };

  if (method === "HEAD") {
    return new Response(null, { status: 206, headers: rangeHeaders });
  }

  return new Response(streamFile(start, end), {
    status: 206,
    headers: rangeHeaders,
  });
}

export async function GET(req: Request): Promise<Response> {
  return handle(req, "GET");
}

export async function HEAD(req: Request): Promise<Response> {
  return handle(req, "HEAD");
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, If-None-Match, If-Range",
      "Access-Control-Max-Age": "86400",
    },
  });
}
