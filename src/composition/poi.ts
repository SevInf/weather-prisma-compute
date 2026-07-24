import { PrismaPoiRepository } from "@/repositories/poi/poi-repository";
import { PoiService } from "@/services/poi-service";

export const poiService = new PoiService(new PrismaPoiRepository());
