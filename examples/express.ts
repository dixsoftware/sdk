import express from "express";
import { DixBase } from "@dixbase/payments";

const app = express();
const dixbase = new DixBase({
  apiKey: process.env.DIXBASE_API_KEY!
});

app.post("/checkout", express.json(), async (req, res, next) => {
  try {
    const session = await dixbase.checkout.create({
      name: "Plan Professional",
      amount: 99,
      currency: "cur_xxxxx",
      customerEmail: req.body.email,
      successUrl: "https://miweb.com/success",
      cancelUrl: "https://miweb.com/cancel",
      clientReferenceId: req.body.orderId,
      metadata: {
        orderId: req.body.orderId
      }
    });

    res.redirect(303, session.checkoutUrl);
  } catch (error) {
    next(error);
  }
});

app.post("/webhooks/dixbase", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.header("X-DixBase-Signature");

  try {
    const event = dixbase.webhooks.verifySignature(req.body, signature, process.env.DIXBASE_WEBHOOK_SECRET!);

    if (event.type === "checkout.session.completed" || event.type === "payment.succeeded") {
      // Consultar o actualizar la orden interna aqui.
      console.log("Pago confirmado", event.data);
    }

    res.sendStatus(200);
  } catch {
    res.sendStatus(400);
  }
});

app.listen(3000, () => {
  console.log("Servidor escuchando en http://localhost:3000");
});
