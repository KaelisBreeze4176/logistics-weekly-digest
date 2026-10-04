import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { buildWeeklyDigest, digestRequestSchema } from "./digest_decision.js";

const port = Number(process.env.PORT ?? 3000);

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/jobs/weekly-logistics-digest") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = digestRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const digest = buildWeeklyDigest(input);

    // This is the handoff point for the app's existing email provider.
    console.log(JSON.stringify({ event: "weekly_digest_ready", digest }));
    sendJson(response, 200, { digest });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      sendJson(response, 400, { error: "Invalid digest request" });
      return;
    }
    sendJson(response, 500, { error: "Digest processing failed" });
  }
}).listen(port, () => {
  console.log(`Digest route listening on http://localhost:${port}`);
});
