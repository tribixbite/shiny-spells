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
import { basePath } from "@config";

const cwd = process.cwd();
const rules = {
  rules: [
    { pathPattern: "/sendcredits", apiPath: `${basePath}/api/sendcredits` },
  ],
};

export const app = new Elysia()
  .use(
    cors({
      origin: "*", // ["http://localhost:3001", "http://localhost:3001"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )
  .get("/actions.json", (res) => {
    return JSON.stringify(rules);
  })
  .use(swagger())
  // .use(
  // 	rateLimit({
  // 		max: 60,
  // 	}),
  // )
  .use(
    autoroutes({
      routesDir: path.join(cwd, "src", "routes"),
    })
  )
  .use(error)
  .decorate({
    db,
    logger,
    env,
  })
  .listen(env.SERVER_PORT);

logger.info(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
