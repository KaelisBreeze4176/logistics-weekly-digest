import { createHash } from "node:crypto";
import { infrai } from "../src/infrai.js";

const task = process.env.DIGEST_TASK_URL;
if (!task) throw new Error("DIGEST_TASK_URL is required");

const cron_expr = "0 9 * * 1";
const idempotencyKey = createHash("sha256")
  .update(`weekly-logistics-digest:${cron_expr}:${task}`)
  .digest("hex");

const result = await infrai.cron.create({ cron_expr, task }, idempotencyKey);
console.log(JSON.stringify({ scheduled: true, job_id: result.job_id }, null, 2));
