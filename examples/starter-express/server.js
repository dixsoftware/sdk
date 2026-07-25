import express from "express";
import rateLimit from "express-rate-limit";
import { DixBase } from "@dixbase/payments";

const app = express();
const dixbase = new DixBase({ apiKey: process.env.DIXBASE_API_KEY });

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

app.post("/checkout", checkoutLimiter, express.json(), async (req, res, next) => {
  try {
    const session = await dixbase.checkout.create({
      name: "Order",
      amount: req.body.amount,
      currency: req.body.currency,
      customerEmail: req.body.email,
      successUrl: "https://store.example/success",
      cancelUrl: "https://store.example/cancel",
      clientReferenceId: req.body.orderId
    });
    res.json({ checkoutUrl: session.checkoutUrl });
  } catch (error) {
    next(error);
  }
});

app.post("/webhooks/dixbase", webhookLimiter, express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.header("X-DixBase-Signature");
  const event = dixbase.webhooks.verifySignature(req.body, signature, process.env.DIXBASE_WEBHOOK_SECRET);

  if (event.type === "checkout.session.completed" || event.type === "payment.succeeded") {
    console.log("Fulfill order", event.data);
  }

  res.sendStatus(200);
});

app.listen(3000, () => console.log("DixBase starter listening on http://localhost:3000"));
