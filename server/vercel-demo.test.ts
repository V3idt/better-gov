import { afterEach, describe, expect, it } from "bun:test";
import { createVercelDemoFetchHandler, resetVercelDemoState } from "./vercel-demo.ts";

const configuredDomain = process.env.BETTER_GOV_ALLOWED_EMAIL_DOMAIN ?? "university.edu";
const emailAtConfiguredDomain = (localPart: string) => `${localPart}@${configuredDomain}`;

afterEach(() => {
  resetVercelDemoState();
});

describe("vercel demo backend", () => {
  it("serves proposition data without the sqlite backend", async () => {
    const handleRequest = createVercelDemoFetchHandler();
    const response = await handleRequest(new Request("https://example.com/api/propositions?mode=default"));
    const payload = (await response.json()) as { propositions: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(payload.propositions.length).toBeGreaterThan(0);
  });

  it("supports email verification and one stored vote per proposition", async () => {
    const handleRequest = createVercelDemoFetchHandler();
    const email = emailAtConfiguredDomain("demo.student");

    const requestCodeResponse = await handleRequest(
      new Request("https://example.com/api/auth/request-code", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email }),
      }),
    );
    const requestCodePayload = (await requestCodeResponse.json()) as { devCode?: string };

    const verifyResponse = await handleRequest(
      new Request("https://example.com/api/auth/verify-code", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email, code: requestCodePayload.devCode }),
      }),
    );

    const sessionCookie = verifyResponse.headers.get("set-cookie");
    expect(verifyResponse.status).toBe(200);
    expect(sessionCookie).toContain("better-gov.session=");

    const voteResponse = await handleRequest(
      new Request("https://example.com/api/propositions/campus:transparent-department-budgets/vote", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie ?? "",
        },
        body: JSON.stringify({ choice: "approve" }),
      }),
    );
    const votePayload = (await voteResponse.json()) as { action: string };

    expect(voteResponse.status).toBe(200);
    expect(votePayload.action).toBe("created");
  });
});
