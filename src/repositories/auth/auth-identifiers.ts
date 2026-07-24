declare const userIdBrand: unique symbol;
export type UserId = string & { readonly [userIdBrand]: true };

export function userId(id: string): UserId {
	return id as UserId;
}
