import { BunHttpServer } from "@effect/platform-bun";
import { Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { ApiRouterLive } from "./apiRouter.js";

const PORT = 3001;

const AppLayer = ApiRouterLive.pipe(
  Layer.provideMerge(HttpRouter.layer),
  Layer.provide(
    HttpRouter.cors({ allowedOrigins: ["http://localhost:4200"], allowedMethods: ["*"] })
  )
);

export const HttpServerLive = HttpRouter.serve(AppLayer).pipe(
  Layer.provide(BunHttpServer.layer({ port: PORT }))
);
