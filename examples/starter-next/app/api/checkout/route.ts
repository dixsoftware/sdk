import { DixBase } from "@dixbase/payments";
import { NextRequest, NextResponse } from "next/server";

const dixbase = new DixBase({ apiKey: process.env.DIXBASE_API_KEY! });

export async function POST(request: NextRequest) {
  const body = await request.json();
  const session = await dixbase.checkout.create({
    name: "Order",
    amount: body.amount,
    currency: body.currency,
    customerEmail: body.email,
    successUrl: "https://store.example/success",
    cancelUrl: "https://store.example/cancel",
    clientReferenceId: body.orderId
  });

  return NextResponse.json({ checkoutUrl: session.checkoutUrl });
}
