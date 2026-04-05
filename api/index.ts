import { createVercelDemoFetchHandler } from "./vercel-demo.ts";

const USE_VERCEL_DEMO_BACKEND =
  process.env.BETTER_GOV_VERCEL_DEMO_BACKEND === "1" ||
  process.env.VERCEL === "1" ||
  typeof process.env.VERCEL_ENV === "string";

let cachedHandler: ((request: Request) => Promise<Response>) | null = null;
const vercelDemoHandler = createVercelDemoFetchHandler();

const buildDelegatedRequest = (request: Request) => {
  const url = new URL(request.url);
  const forwardedPath = url.searchParams.get("__path") ?? "";
  url.searchParams.delete("__path");
  url.pathname = forwardedPath ? `/api/${forwardedPath}` : "/api";

  return new Request(url, request);
};

export default {
  async fetch(request: Request) {
    if (!cachedHandler) {
      if (USE_VERCEL_DEMO_BACKEND) {
        cachedHandler = vercelDemoHandler;
      } else {
        const { createApiFetchHandler, getSharedDatabase } = await import("../server/app.ts");
        cachedHandler = createApiFetchHandler(getSharedDatabase());
      }
    }

    return cachedHandler(buildDelegatedRequest(request));
  },
};
