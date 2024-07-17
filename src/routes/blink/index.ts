import { t } from "elysia";
import type { App } from "@/index";

export default (app: App) => {
  app.get("/",
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
              href: "/api/sendcredits?amount=5"
            },
            {
              label: "Send $20",
              href: "/api/sendcredits?amount=20"
            },
            {
              label: "Send $100",
              href: "/api/sendcredits?amount=100"
            },
            {
              label: "Custom Donation",
              href: "/api/sendcredits?amount={amount}",
              parameters: [
                {
                  name: "amount",
                  label: "USDC amount"
                }
              ]
            }
          ]
        },
        metadata: {
          recipient: "triQem2gDXHXweNceTKWGfDfN6AnpCHmjR745LXcbix"
        }
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
                    label: t.String()
                  })
                )
              )
            })
          )
        }),
        metadata: t.Object({
          recipient: t.String()
        })
      }),
      detail: {
        description: "Blink action definition for sending credits to tribixbite",
        tags: ["blink", "donation"]
      }
    }
  );

  return app;
};