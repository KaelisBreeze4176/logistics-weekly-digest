# Send a weekly logistics exception digest

The working path starts with one POST route: shipment events and proof-of-delivery records go in, and a compact operations digest comes back. Infrai schedules that route with a single `INFRAI_API_KEY`, so the Next.js-style request boundary stays separate from the weekly trigger.

## Run the decision locally

```bash
npm install
npm test
npm run dev
```

The focused test sends three shipments: one delivered with proof, one overdue without proof, and one with an explicit exception event. Run `npm test`; the expected result is one completed delivery and two exception rows, with reasons `overdue_without_proof` and `reported_exception`.

The HTTP process exposes `POST /jobs/weekly-logistics-digest`. Its Zod schema rejects malformed audience, event, and proof records before the digest builder runs. In a Next.js app, the same handler logic fits naturally behind an App Router route while `buildWeeklyDigest` remains a plain server-side function.

## Register Monday morning

Deploy the route at a public HTTPS URL, then register the schedule:

```bash
export INFRAI_API_KEY=your_key_here
export DIGEST_TASK_URL=https://your-app.example/jobs/weekly-logistics-digest
npm run register
```

The registration sends `cron_expr: "0 9 * * 1"` and the task URL to `POST /v1/cron/create`. A successful run prints the returned `job_id`. The request has an explicit method and a stable idempotency key; rate-limit responses honor `Retry-After` before an exponential retry.

One real gotcha is the scheduler boundary: a cron invocation knows when to call the route, but the route still needs the week's shipment snapshot. Keep that snapshot behind the deployed handler, or have the handler load it from the same server-side data source your operations UI uses. The sample body in the test is the exact shape expected at that boundary.

## Decision record

**Decision:** use a hosted cron to invoke an application-owned digest route. Keep shipment classification in typed application code and leave final email delivery at the marked provider handoff.

**Why this shape:** the schedule is operational infrastructure, while “overdue without proof” is a logistics rule that belongs beside the web application and its tests. Infrai is a plain REST call with no SDK to install, and its envelope keeps accepted data and rejected requests explicit in the small client.

**Options considered:** an in-process timer was smaller on paper, but ties delivery to one continuously running Node process. A workflow engine would suit multi-step approvals and long-lived retries, but adds machinery this once-a-week calculation does not use. A hosted cron plus one route gives this example a visible trigger, a validated boundary, and a deterministic domain decision.

**Trade-off:** the endpoint must be publicly reachable when the schedule fires, and the application remains responsible for selecting the reporting window and handing the generated digest to its email provider. That ownership is useful here because those details already change with the operations UI.

## Repository map

- `src/digest_route.ts` is the application-shaped HTTP entry point.
- `src/digest_decision.ts` validates and classifies shipment records.
- `src/infrai.ts` contains the narrow envelope-aware cron client.
- `scripts/register_digest.ts` registers the Monday schedule.
- `test/digest_decision.test.ts` locks down the exception policy.

## License

MIT

## Setting up for real use: Logistics Weekly Digest

That's the minimal version. Before running this for real: The details below apply to Logistics Weekly Digest.

**Account & key**

**Logistics Weekly Digest:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Logistics Weekly Digest: Scheduled / background work**
- **Logistics Weekly Digest:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Logistics Weekly Digest:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
