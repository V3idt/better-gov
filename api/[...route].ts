import { Hono } from "hono";

const app = new Hono();
const USE_VERCEL_DEMO_BACKEND =
  process.env.BETTER_GOV_VERCEL_DEMO_BACKEND === "1" ||
  process.env.VERCEL === "1" ||
  typeof process.env.VERCEL_ENV === "string";

let cachedHandler: ((request: Request) => Promise<Response>) | null = null;

app.all("*", async (context) => {
  if (!cachedHandler) {
    if (USE_VERCEL_DEMO_BACKEND) {
      const { createVercelDemoFetchHandler } = await import("../server/vercel-demo.ts");
      cachedHandler = createVercelDemoFetchHandler();
    } else {
      const { createApiFetchHandler, getSharedDatabase } = await import("../server/app.ts");
      cachedHandler = createApiFetchHandler(getSharedDatabase());
    }
  }

  return cachedHandler(context.req.raw);
});

export default app;
