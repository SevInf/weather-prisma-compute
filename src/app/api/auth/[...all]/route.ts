import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/composition/auth";

export const { GET, POST } = toNextJsHandler(auth);
