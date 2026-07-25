import { DixBase, verifyNextWebhook } from "@dixbase/payments";
import { NextRequest, NextResponse } from "next/server";

const dixbase = new DixBase({ apiKey: process.env.DIXBASE_API_KEY! });

export async function POST(request: NextRequest) {
  const event = await verifyNextWebhook(dixbase, request, process.env.DIXBASE_WEBHOOK_SECRET!);

  if (event.type === "checkout.session.completed" || event.type === "payment.succeeded") {
    console.log("Fulfill order", event.data);
  }

  return NextResponse.json({ received: true });
}
