import { createTutorServerApp } from "../server.js";

let appPromise: Promise<
  Awaited<ReturnType<typeof createTutorServerApp>>
> | null = null;

const getTutorApp = async () => {
  appPromise ??= createTutorServerApp({ serveClient: false });
  return (await appPromise).app;
};

const normalizeVercelCatchAllUrl = (req: any) => {
  if (typeof req.url !== "string" || req.url.startsWith("/api")) return;

  const pathParam = req.query?.path;
  const segments = Array.isArray(pathParam)
    ? pathParam
    : pathParam
      ? [pathParam]
      : [];
  if (!segments.length) return;

  const [, query = ""] = req.url.split("?", 2);
  req.url = `/api/${segments.map((segment) => encodeURIComponent(String(segment))).join("/")}${
    query ? `?${query}` : ""
  }`;
};

export const vercelHandler = async (req: any, res: any) => {
  normalizeVercelCatchAllUrl(req);
  const app = await getTutorApp();
  return app(req, res);
};

export const config = {
  api: {
    bodyParser: false,
  },
};
