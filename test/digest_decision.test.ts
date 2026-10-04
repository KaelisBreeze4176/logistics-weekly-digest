import assert from "node:assert/strict";
import test from "node:test";
import { buildWeeklyDigest, digestRequestSchema } from "../src/digest_decision.js";

test("flags reported exceptions and overdue shipments without proof", () => {
  const input = digestRequestSchema.parse({
    periodEnding: "2026-09-28T09:00:00.000Z",
    audience: { name: "West Coast operations", email: "ops@example.com" },
    shipments: [
      {
        shipmentId: "SHP-100",
        destination: "Oakland, CA",
        promisedAt: "2026-09-25T17:00:00.000Z",
        events: [{
          type: "delivered",
          occurredAt: "2026-09-25T16:20:00.000Z",
          detail: "Delivered to receiving desk"
        }],
        proofOfDelivery: {
          objectKey: "proof/SHP-100.pdf",
          receivedAt: "2026-09-25T16:25:00.000Z"
        }
      },
      {
        shipmentId: "SHP-101",
        destination: "Reno, NV",
        promisedAt: "2026-09-26T17:00:00.000Z",
        events: [{
          type: "in_transit",
          occurredAt: "2026-09-26T08:00:00.000Z",
          detail: "Departed regional hub"
        }],
        proofOfDelivery: null
      },
      {
        shipmentId: "SHP-102",
        destination: "Fresno, CA",
        promisedAt: "2026-09-29T17:00:00.000Z",
        events: [{
          type: "exception",
          occurredAt: "2026-09-27T14:00:00.000Z",
          detail: "Address confirmation needed"
        }],
        proofOfDelivery: null
      }
    ]
  });

  const digest = buildWeeklyDigest(input);

  assert.equal(digest.deliveredWithProof, 1);
  assert.deepEqual(digest.exceptions.map(({ shipmentId, reason }) => ({ shipmentId, reason })), [
    { shipmentId: "SHP-101", reason: "overdue_without_proof" },
    { shipmentId: "SHP-102", reason: "reported_exception" }
  ]);
});
