import { z } from "zod";

export const digestRequestSchema = z.object({
  periodEnding: z.string().datetime(),
  audience: z.object({
    name: z.string().min(1),
    email: z.string().email()
  }),
  shipments: z.array(z.object({
    shipmentId: z.string().min(1),
    destination: z.string().min(1),
    promisedAt: z.string().datetime(),
    events: z.array(z.object({
      type: z.enum(["picked_up", "in_transit", "delivered", "exception"]),
      occurredAt: z.string().datetime(),
      detail: z.string().min(1)
    })),
    proofOfDelivery: z.object({
      objectKey: z.string().min(1),
      receivedAt: z.string().datetime()
    }).nullable()
  }))
});

export type DigestRequest = z.infer<typeof digestRequestSchema>;
export type DigestException = {
  shipmentId: string;
  destination: string;
  reason: "reported_exception" | "overdue_without_proof";
  detail: string;
};

export type WeeklyDigest = {
  periodEnding: string;
  recipient: string;
  shipmentCount: number;
  deliveredWithProof: number;
  exceptions: DigestException[];
};

export function buildWeeklyDigest(input: DigestRequest): WeeklyDigest {
  const cutoff = Date.parse(input.periodEnding);
  const exceptions: DigestException[] = [];

  for (const shipment of input.shipments) {
    const reported = [...shipment.events]
      .reverse()
      .find((event) => event.type === "exception");

    if (reported) {
      exceptions.push({
        shipmentId: shipment.shipmentId,
        destination: shipment.destination,
        reason: "reported_exception",
        detail: reported.detail
      });
      continue;
    }

    if (Date.parse(shipment.promisedAt) < cutoff && shipment.proofOfDelivery === null) {
      exceptions.push({
        shipmentId: shipment.shipmentId,
        destination: shipment.destination,
        reason: "overdue_without_proof",
        detail: "Promised delivery passed without proof of delivery"
      });
    }
  }

  return {
    periodEnding: input.periodEnding,
    recipient: input.audience.email,
    shipmentCount: input.shipments.length,
    deliveredWithProof: input.shipments.filter((shipment) =>
      shipment.proofOfDelivery !== null &&
      shipment.events.some((event) => event.type === "delivered")
    ).length,
    exceptions
  };
}
