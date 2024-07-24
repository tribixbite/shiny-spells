import path from "node:path";
import { env } from "@/env";
import cors from "@elysiajs/cors";
import swagger from "@elysiajs/swagger";
import { logger } from "@utils/logger";
import { Elysia } from "elysia";
import { autoroutes } from "elysia-autoroutes";
import { rateLimit } from "elysia-rate-limit";
import { db } from "./db";
import { error } from "./plugins/error/error";

export const app = new Elysia()
	.use(
		cors({
			origin: "*", // ["http://localhost:3000", "http://localhost:3001"],
			allowedHeaders: ["Content-Type", "Authorization"],
		}),
	)
	.use(swagger())
	// .use(
	// 	rateLimit({
	// 		max: 60,
	// 	}),
	// )
	.use(
		autoroutes({
			routesDir:
				env.NODE_ENV === "test" ? path.resolve(__dirname, "routes") : "routes",
		}),
	)
	.use(error)
	.decorate({
		db,
		logger,
		env,
	})
	.listen(env.SERVER_PORT);

logger.info(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
