import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { serve as serveInngest } from "inngest/hono";
import { inngest } from "./inngest/client.js";
import { electricityBillWorkflow, dailyBillScanCron } from "./inngest/functions.js";
import { initDb } from "@taskmate/db";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok", service: "worker" }));

// Inngest serve endpoint
app.on(
  ["GET", "POST", "PUT"],
  "/api/inngest",
  serveInngest({
    client: inngest,
    functions: [electricityBillWorkflow, dailyBillScanCron],
  })
);

const port = Number(process.env.WORKER_PORT || 4001);

async function start() {
  await initDb();
  serve({ fetch: app.fetch, port }, () => {
    console.log(`🚀 TaskMate Inngest Worker listening on http://localhost:${port}`);
    console.log(`⚡ Inngest endpoint available at http://localhost:${port}/api/inngest`);
  });
}

start().catch((err) => {
  console.error("Worker failed to start:", err);
});
