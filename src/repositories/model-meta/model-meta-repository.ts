export type IconModel = "dwd_icon_d2" | "dwd_icon_eu" | "dwd_icon";

export const GRACE_MS = 10 * 60 * 1000;

export type ModelMeta = {
	availableAt: Date;
	updateIntervalSeconds: number;
};

export interface ModelMetaRepository {
	fetchMeta(model: IconModel): Promise<ModelMeta | null>;
}
