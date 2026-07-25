import { NextRequest, NextResponse } from "next/server";
import { DixBase } from "@dixbase/payments";

const dixbase = new DixBase({
  apiKey: process.env.DIXBASE_API_KEY!
});

export async function POST(request: NextRequest) {
  const body = await request.json();

  const session = await dixbase.checkout.create({
    name: "Plan Professional",
    amount: 99,
    currency: "cur_xxxxx",
    customerEmail: body.email,
    successUrl: "https://miweb.com/success",
    cancelUrl: "https://miweb.com/cancel",
    clientReferenceId: body.orderId
  });

  return NextResponse.json({ checkoutUrl: session.checkoutUrl });
}

export async function PUT(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-DixBase-Signature");

  const event = dixbase.webhooks.verifySignature(rawBody, signature, process.env.DIXBASE_WEBHOOK_SECRET!);

  if (event.type === "checkout.session.completed" || event.type === "payment.succeeded") {
    // Marcar la orden como pagada despues de verificar firma.
    console.log(event.data);
  }

  return NextResponse.json({ received: true });
}
