import { Hono } from "hono";
import { createApiFetchHandler, getSharedDatabase } from "../server/app.ts";

const db = getSharedDatabase();
const handleRequest = createApiFetchHandler(db);
const app = new Hono();

app.all("*", async (context) => handleRequest(context.req.raw));

export default app;
