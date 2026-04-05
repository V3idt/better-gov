import { createVercelDemoFetchHandler } from "../server/vercel-demo.ts";

const USE_VERCEL_DEMO_BACKEND =
  process.env.BETTER_GOV_VERCEL_DEMO_BACKEND === "1" ||
  process.env.VERCEL === "1" ||
  typeof process.env.VERCEL_ENV === "string";

let cachedHandler: ((request: Request) => Promise<Response>) | null = null;
const vercelDemoHandler = createVercelDemoFetchHandler();

export default {
  async fetch(request: Request) {
    if (USE_VERCEL_DEMO_BACKEND) {
      return vercelDemoHandler(request);
    }

    if (!cachedHandler) {
      const { createApiFetchHandler, getSharedDatabase } = await import("../server/app.ts");
      cachedHandler = createApiFetchHandler(getSharedDatabase());
    }

    return cachedHandler(request);
  },
};
