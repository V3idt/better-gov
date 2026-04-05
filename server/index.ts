import { createApiFetchHandler, getSharedDatabase } from "./app.ts";

const port = Number(process.env.BETTER_GOV_API_PORT ?? "8787");
const db = getSharedDatabase();
const server = Bun.serve({
  port,
  fetch: createApiFetchHandler(db),
});

console.log(`better-gov api running on http://127.0.0.1:${server.port}`);

const shutdown = () => {
  server.stop(true);
};

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
