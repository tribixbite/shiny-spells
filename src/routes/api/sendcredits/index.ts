import type { App } from "@/index";
import { cors } from "@elysiajs/cors";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { t } from "elysia";

// USDC token mint address on Solana mainnet
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// Your donation recipient address
const RECIPIENT_ADDRESS = "triQem2gDXHXweNceTKWGfDfN6AnpCHmjR745LXcbix";
const rpcUrl = Bun.env.RPC_URL as string;
const localhost = Bun.env.LOCALHOST as string;
const basePath =
  localhost === "true" ? "http://localhost:3000" : "https://shinyspells.com";

export default (app: App) => {
  app
    .get(
      "/",
      () => {
        return {
          icon: "https://shdw-drive.genesysgo.net/8Aa59VQz3JtP7LNL3wfmLyhNgtvcRsG1vvR7NPMw1GVN/triblink.webp",
          label: "Send Credits",
          title: "supports tribixbite's Solana endeavors",
          description: "Choose an amount to in USDC.",
          links: {
            actions: [
              {
                label: "Send $5",
                href: `${basePath}/api/sendcredits/5`,
              },
              {
                label: "Send $20",
                href: `${basePath}/api/sendcredits/20`,
              },
              {
                label: "Send $100",
                href: `${basePath}/api/sendcredits/100`,
              },
              {
                label: "Custom Donation",
                href: `${basePath}/api/sendcredits/{amount}`,
                parameters: [
                  {
                    name: "amount",
                    label: "USDC amount",
                  },
                ],
              },
            ],
          },
          metadata: {
            recipient: RECIPIENT_ADDRESS,
          },
        };
      },
      {
        response: t.Object({
          icon: t.String(),
          label: t.String(),
          title: t.String(),
          description: t.String(),
          links: t.Object({
            actions: t.Array(
              t.Object({
                label: t.String(),
                href: t.String(),
                parameters: t.Optional(
                  t.Array(
                    t.Object({
                      name: t.String(),
                      label: t.String(),
                    })
                  )
                ),
              })
            ),
          }),
          metadata: t.Object({
            recipient: t.String(),
          }),
        }),
      }
    )
    .get(
      "/:amount",
      ({ params: { amount } }) => {
        return {
          icon: "https://shdw-drive.genesysgo.net/8Aa59VQz3JtP7LNL3wfmLyhNgtvcRsG1vvR7NPMw1GVN/triblink.webp",
          label: `Send $${amount}`,
          title: "supports tribixbite's Solana endeavors",
          description: `Send ${amount} USDC to support the cause.`,
        };
      },
      {
        params: t.Object({
          amount: t.String(),
        }),
        response: t.Object({
          icon: t.String(),
          label: t.String(),
          title: t.String(),
          description: t.String(),
        }),
      }
    )
    .post(
      "/:amount",
      async ({ params, body }) => {
        const { amount } = params;
        const { account } = body;
        console.log({ amount, account });
        const amountInUsdcUnits = Math.floor(
          Number.parseFloat(amount) * 1_000_000
        );
        const connection = new Connection(rpcUrl);
        const recipientAta = getAssociatedTokenAddressSync(
          USDC_MINT,
          new PublicKey(RECIPIENT_ADDRESS)
        );

        const transferInstruction = createTransferCheckedInstruction(
          recipientAta, // source (this will be replaced by the wallet)
          USDC_MINT,
          recipientAta,
          new PublicKey(account),
          amountInUsdcUnits,
          6
        );

        const transaction = new Transaction().add(transferInstruction);
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        const serializedTransaction = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });

        return {
          transaction: serializedTransaction.toString("base64"),
        };
      },
      {
        params: t.Object({
          amount: t.String(),
        }),
        body: t.Object({
          account: t.String(),
        }),
        response: t.Object({
          transaction: t.String(),
        }),
      }
    );
  return app;
};
