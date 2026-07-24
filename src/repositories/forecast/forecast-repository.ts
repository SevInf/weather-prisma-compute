declare const poiIdBrand: unique symbol;
export type PoiId = number & { readonly [poiIdBrand]: true };

export function poiId(id: number): PoiId {
	return id as PoiId;
}

export type ForecastPoint = {
	id: PoiId;
	latitude: number;
	longitude: number;
};

export type HourlyBlock = {
	time: string[];
	temperature_2m: Array<number | null>;
	dew_point_2m: Array<number | null>;
	cloud_cover_low: Array<number | null>;
	cloud_cover_mid: Array<number | null>;
	cloud_cover_high: Array<number | null>;
};

export interface ForecastRepository {
	hourlyBlocks(points: ForecastPoint[]): Promise<Map<PoiId, HourlyBlock> | null>;
}
