import postgres from "@prisma-next/postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

// Next.js dev-server fast refresh can re-evaluate this module on every change,
// which would otherwise leak a fresh pg.Pool per reload. Cache the client on
// `globalThis` in non-production builds so all callers share one pool.

const createDb = () =>
  postgres<Contract>({
    contractJson,
    url: process.env["DATABASE_URL"]!,
  });

declare global {
  // eslint-disable-next-line no-var
  var __prismaNextDb: ReturnType<typeof createDb> | undefined;
}

export const db = globalThis.__prismaNextDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prismaNextDb = db;
}
