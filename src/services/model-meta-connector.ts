import type { IconModel } from "./model-clock";

// Re-check window when a run is late or its meta is unknown.
export const GRACE_MS = 10 * 60 * 1000;

export type ModelMeta = {
	availableAt: Date;
	updateIntervalSeconds: number;
};

export interface ModelMetaConnector {
	fetchMeta(model: IconModel): Promise<ModelMeta | null>;
}
