import { DixBase } from "@dixbase/payments";

const dixbase = new DixBase({
  apiKey: process.env.DIXBASE_API_KEY!
});

const session = await dixbase.checkout.create({
  name: "Plan Professional",
  description: "Suscripcion mensual",
  amount: 99,
  currency: "cur_xxxxx",
  acceptedCurrencies: ["cur_xxxxx", "cur_yyyyy"],
  customerEmail: "cliente@email.com",
  successUrl: "https://miweb.com/success",
  cancelUrl: "https://miweb.com/cancel",
  clientReferenceId: "order_123",
  metadata: {
    userId: "123",
    plan: "professional"
  },
  expiresInMinutes: 30
});

console.log(session.checkoutUrl);
