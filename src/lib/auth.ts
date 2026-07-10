import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Next.js dev-server fast refresh can re-evaluate this module on every change,
// which would otherwise leak a fresh pg.Pool per reload. Cache the auth
// instance (which owns the pool) on `globalThis` in non-production builds so
// all callers share one pool. Same pattern as `src/prisma/db.ts`.

const createAuth = () =>
	betterAuth({
		database: new Pool({
			connectionString: process.env["DATABASE_URL"],
		}),
		emailAndPassword: {
			enabled: true,
		},
	});

declare global {
	// eslint-disable-next-line no-var
	var __betterAuth: ReturnType<typeof createAuth> | undefined;
}

export const auth = globalThis.__betterAuth ?? createAuth();

if (process.env.NODE_ENV !== "production") {
	globalThis.__betterAuth = auth;
}
