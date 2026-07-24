import { betterAuth } from "better-auth";
import { createPrismaNextAuthRepository } from "@/repositories/auth/prisma-next-auth-repository";

// Next.js dev-server fast refresh can re-evaluate this module on every change.
// Cache the auth instance on `globalThis` in non-production builds so all
// callers share one instance. The underlying database connection is the
// Prisma Next client from `src/prisma/db.ts`, which carries its own cache.

const createAuth = () => {
	const authRepository = createPrismaNextAuthRepository();
	return betterAuth({
		database: authRepository,
		emailAndPassword: {
			enabled: true,
		},
	});
};

declare global {
	// eslint-disable-next-line no-var
	var __betterAuth: ReturnType<typeof createAuth> | undefined;
}

export const auth = globalThis.__betterAuth ?? createAuth();

if (process.env.NODE_ENV !== "production") {
	globalThis.__betterAuth = auth;
}
