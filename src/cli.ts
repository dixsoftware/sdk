import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { DixBase } from "./index";
import type { SandboxForceStatus } from "./types";

type Command = "currencies" | "checkout:sandbox" | "webhooks:verify" | "mock-server" | "listen" | "help" | "--help" | "-h";

async function main(): Promise<void> {
  const [command = "help", ...args] = process.argv.slice(2) as [Command, ...string[]];

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const apiKey = process.env.DIXBASE_API_KEY;
  if (!apiKey && command !== "webhooks:verify") {
    throw new Error("Set DIXBASE_API_KEY before using this command.");
  }

  const dixbase = new DixBase({
    apiKey: apiKey || "unused",
    baseUrl: process.env.DIXBASE_BASE_URL
  });

  if (command === "currencies") {
    console.log(JSON.stringify(await dixbase.checkout.currencies(), null, 2));
    return;
  }

  if (command === "checkout:sandbox") {
    const payload = {
      name: readArg(args, "--name") ?? "DixBase CLI sandbox checkout",
      amount: Number(readArg(args, "--amount") ?? "10"),
      currency: requiredArg(args, "--currency"),
      customerEmail: readArg(args, "--email"),
      clientReferenceId: readArg(args, "--reference"),
      forceStatus: normalizeStatus(readArg(args, "--status")),
      metadata: {
        source: "dixbase_cli"
      }
    };
    console.log(JSON.stringify(await dixbase.checkout.createSandbox(payload), null, 2));
    return;
  }

  if (command === "webhooks:verify") {
    const bodyPath = requiredArg(args, "--body");
    const signature = requiredArg(args, "--signature");
    const secret = process.env.DIXBASE_WEBHOOK_SECRET ?? requiredArg(args, "--secret");
    const event = dixbase.webhooks.verifySignature(readFileSync(bodyPath), signature, secret);
    console.log(JSON.stringify(event, null, 2));
    return;
  }

  if (command === "mock-server") {
    startMockServer(Number(readArg(args, "--port") ?? "8787"));
    return;
  }

  if (command === "listen") {
    startWebhookListener(Number(readArg(args, "--port") ?? "8788"), readArg(args, "--forward-to"));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function readArg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function requiredArg(args: string[], name: string): string {
  const value = readArg(args, name);
  if (!value) {
    throw new Error(`Missing required argument ${name}.`);
  }
  return value;
}

function printHelp(): void {
  console.log(`DixBase CLI

Commands:
  dixbase currencies
  dixbase checkout:sandbox --currency cur_xxxxx --amount 10 [--status open|complete|expired|canceled]
  dixbase webhooks:verify --body payload.json --signature "t=...,v1=..." --secret whsec_xxxxx
  dixbase mock-server --port 8787
  dixbase listen --port 8788 --forward-to http://localhost:3000/webhooks/dixbase

Environment:
  DIXBASE_API_KEY
  DIXBASE_BASE_URL
  DIXBASE_WEBHOOK_SECRET
`);
}

function startMockServer(port: number): void {
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");

    if (request.url?.endsWith("/checkout/currencies")) {
      response.end(JSON.stringify({
        object: "list",
        data: [{ id: "cur_mock_usdt", name: "Mock USDT", ticker: "USDT", decimals: 6, networks: [] }]
      }));
      return;
    }

    if (request.url?.endsWith("/checkout/sessions") && request.method === "POST") {
      response.statusCode = 201;
      response.end(JSON.stringify({
        id: "chk_mock_123",
        object: "checkout.session",
        status: "open",
        payment_status: "unpaid",
        mode: "payment",
        amount: "10",
        currency: "USDT",
        metadata: {},
        checkout_url: "https://pay.dixbase.com/checkout/chk_mock_123",
        invoice_id: "pay_mock_123",
        livemode: false
      }));
      return;
    }

    response.statusCode = 404;
    response.end(JSON.stringify({ detail: "not_found" }));
  });

  server.listen(port, () => console.log(`DixBase mock server listening on http://localhost:${port}`));
}

function startWebhookListener(port: number, forwardTo?: string): void {
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);
    console.log(body.toString("utf8"));

    if (forwardTo) {
      await fetch(forwardTo, {
        method: request.method,
        headers: {
          "Content-Type": request.headers["content-type"] ?? "application/json",
          "X-DixBase-Signature": request.headers["x-dixbase-signature"]?.toString() ?? ""
        },
        body
      });
    }

    response.statusCode = 200;
    response.end("ok");
  });

  server.listen(port, () => console.log(`DixBase webhook listener on http://localhost:${port}`));
}

function normalizeStatus(value: string | undefined): SandboxForceStatus {
  if (value === "complete" || value === "completed" || value === "expired" || value === "canceled" || value === "open") {
    return value;
  }
  return "open";
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
