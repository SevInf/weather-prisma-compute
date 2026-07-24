import { createAdapterFactory } from "better-auth/adapters";
import type { CleanedWhere } from "@better-auth/core/db/adapter";
import { and, not, or } from "@prisma-next/sql-orm-client";
import { db } from "@/prisma/db";

// Raw BetterAuth persistence boundary backed by Prisma Next. BetterAuth hands
// us dynamic model names and predicates; this repository translates them to
// contract ORM queries. The adapter factory owns ids and output shaping.

const MODEL_MAP = {
	user: "User",
	session: "Session",
	account: "Account",
	verification: "Verification",
} as const;

type BetterAuthModel = keyof typeof MODEL_MAP;

// The adapter boundary is inherently dynamic (model and field names arrive as
// strings), so the collections are handled through a loosely-typed facade.
// All queries still execute against the fully-typed contract at runtime.
type AnyCollection = {
	where(predicate: (m: any) => unknown): AnyCollection;
	orderBy(order: (m: any) => unknown): AnyCollection;
	take(n: number): AnyCollection;
	skip(n: number): AnyCollection;
	all(): PromiseLike<Record<string, unknown>[]>;
	first(): Promise<Record<string, unknown> | null>;
	create(data: Record<string, unknown>): Promise<Record<string, unknown>>;
	update(
		data: Record<string, unknown>,
	): Promise<Record<string, unknown> | null>;
	updateCount(data: Record<string, unknown>): Promise<number>;
	delete(): Promise<Record<string, unknown> | null>;
	deleteCount(): Promise<number>;
	aggregate(fn: (agg: any) => unknown): Promise<Record<string, number>>;
};

function collection(model: string): AnyCollection {
	const contractModel = MODEL_MAP[model as BetterAuthModel];
	if (!contractModel) {
		throw new Error(
			`[prisma-next-adapter] Unknown BetterAuth model "${model}". ` +
				`Known models: ${Object.keys(MODEL_MAP).join(", ")}.`,
		);
	}
	return (db.orm.public as Record<string, unknown>)[
		contractModel
	] as AnyCollection;
}

// Translate one cleaned where-clause into a predicate expression against the
// field proxy. Only the operators the email+password flows exercise are
// implemented; pattern-match operators (contains / starts_with / ends_with)
// and case-insensitive mode are unreachable with this app's configuration and
// throw descriptively rather than ship untested LIKE-escape translations.
function clauseExpression(field: any, clause: CleanedWhere): unknown {
	const { operator, value, mode } = clause;
	if (mode === "insensitive") {
		throw new Error(
			`[prisma-next-adapter] Case-insensitive mode is not supported ` +
				`(field "${clause.field}", operator "${operator}").`,
		);
	}
	switch (operator) {
		case "eq":
			return value === null ? field.isNull() : field.eq(value);
		case "ne":
			return value === null ? field.isNotNull() : field.neq(value);
		case "lt":
			return field.lt(value);
		case "lte":
			return field.lte(value);
		case "gt":
			return field.gt(value);
		case "gte":
			return field.gte(value);
		case "in":
			return field.in(Array.isArray(value) ? value : [value]);
		case "not_in":
			return not(field.in(Array.isArray(value) ? value : [value]));
		default:
			throw new Error(
				`[prisma-next-adapter] Unsupported operator "${operator}" ` +
					`(field "${clause.field}"). Supported: eq, ne, lt, lte, gt, ` +
					`gte, in, not_in.`,
			);
	}
}

// Compose the cleaned where-list the way BetterAuth's first-party adapters
// do: a left-to-right fold where each clause combines with the accumulated
// predicate using its own connector (AND by default, OR when specified).
function applyWhere(base: AnyCollection, where: CleanedWhere[]): AnyCollection {
	const [head, ...rest] = where;
	if (!head) return base;
	return base.where((m) => {
		let expression = clauseExpression(m[head.field], head);
		for (const clause of rest) {
			const next = clauseExpression(m[clause.field], clause);
			expression =
				clause.connector === "OR"
					? or(expression as never, next as never)
					: and(expression as never, next as never);
		}
		return expression;
	});
}

export const createPrismaNextAuthRepository = () => createAdapterFactory({
	config: {
		adapterId: "prisma-next",
		adapterName: "Prisma Next Adapter",
		// Contract ids are text columns with application-generated string ids.
		supportsNumericIds: false,
		// Postgres handles dates, booleans, and JSON natively; no translation.
		supportsDates: true,
		supportsBooleans: true,
		supportsJSON: true,
		usePlural: false,
		// Sequential execution (the factory's as-is fallback). Building a real
		// DBTransactionAdapter over db.transaction(...) would require
		// re-invoking the adapter factory with the BetterAuth options captured
		// out-of-band, which relies on undocumented invocation ordering.
		transaction: false,
	},
	adapter: () => ({
		create: async ({ model, data }) => {
			return (await collection(model).create(
				data as Record<string, unknown>,
			)) as never;
		},
		findOne: async ({ model, where }) => {
			return (await applyWhere(collection(model), where).first()) as never;
		},
		findMany: async ({ model, where, limit, sortBy, offset }) => {
			let query = applyWhere(collection(model), where ?? []);
			if (sortBy) {
				query = query.orderBy((m) =>
					sortBy.direction === "desc"
						? m[sortBy.field].desc()
						: m[sortBy.field].asc(),
				);
			}
			if (offset !== undefined && offset > 0) query = query.skip(offset);
			if (limit !== undefined) query = query.take(limit);
			return (await query.all()) as never;
		},
		update: async ({ model, where, update }) => {
			return (await applyWhere(collection(model), where).update(
				update as Record<string, unknown>,
			)) as never;
		},
		updateMany: async ({ model, where, update }) => {
			return applyWhere(collection(model), where).updateCount(
				update as Record<string, unknown>,
			);
		},
		delete: async ({ model, where }) => {
			await applyWhere(collection(model), where).delete();
		},
		deleteMany: async ({ model, where }) => {
			return applyWhere(collection(model), where).deleteCount();
		},
		count: async ({ model, where }) => {
			const result = await applyWhere(collection(model), where ?? []).aggregate(
				(agg) => ({ total: agg.count() }),
			);
			return result["total"] ?? 0;
		},
	}),
});
