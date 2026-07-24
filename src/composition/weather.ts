import { ForecastService } from "@/services/forecast-service";
import { ModelMetaCacheRepository } from "@/repositories/model-meta/model-meta-cache-repository";
import { OpenMeteoModelMetaRepository } from "@/repositories/model-meta/open-meteo-model-meta-repository";
import { PrismaModelRunRepository } from "@/repositories/model-run/model-run-repository";
import { PrismaForecastCacheRepository } from "@/repositories/forecast/forecast-cache-repository";
import { OpenMeteoForecastRepository } from "@/repositories/forecast/open-meteo-forecast-repository";
import { ModelClock } from "@/services/model-clock";
import { WeatherService } from "@/services/weather-service";

const modelMetaRepository = new ModelMetaCacheRepository(
	new PrismaModelRunRepository(),
	new OpenMeteoModelMetaRepository(),
);
const modelClock = new ModelClock(modelMetaRepository);
const forecastService = new ForecastService(
	new PrismaForecastCacheRepository(),
	new OpenMeteoForecastRepository(),
	modelClock,
);

export const weatherService = new WeatherService(forecastService);
