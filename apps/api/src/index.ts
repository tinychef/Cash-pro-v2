// ============================================================
// Node server entrypoint (also works on Cloud Run / containers).
// ============================================================
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8080);
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`Cash Pro API listening on :${info.port}`);
});
