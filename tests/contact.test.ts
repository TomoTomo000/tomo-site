import { describe, expect, test } from "bun:test";
import {
  buildContactEmailText,
  handleContactRequest,
  type ContactEnvironment,
} from "@/features/contact/contact.server";
import type { ContactInput } from "@/features/contact/contact.schema";

const validInput = {
  submissionId: "9c56d0e4-a1c2-4f8a-9b32-7788c38b7c21",
  name: "山田 太郎",
  email: "taro@example.com",
  budget: "100000-300000",
  message: "お問い合わせ内容のテストです。",
  turnstileToken: "valid-token",
} satisfies ContactInput;

function createEnvironment(rateLimitSuccess = true): ContactEnvironment {
  return {
    APP_ENV: "production",
    SITE_URL: "https://tomo-site.page",
    CONTACT_FROM_EMAIL: "TOMO Website <contact@tomo-site.page>",
    CONTACT_TO_EMAIL: "owner@example.com",
    RESEND_API_KEY: "resend-secret",
    TURNSTILE_SECRET_KEY: "turnstile-secret",
    CONTACT_RATE_LIMITER: {
      limit: async () => ({ success: rateLimitSuccess }),
    },
  };
}

function createRequest(body: unknown = validInput): Request {
  return new Request("https://tomo-site.page/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.1",
    },
    body: JSON.stringify(body),
  });
}

describe("contact API", () => {
  test.each([
    { label: "local development", appEnv: "development", siteUrl: "http://localhost:5173", secret: "1x0000000000000000000000000000000AA", success: true, testingKey: true, status: 200 },
    { label: "failed local verification", appEnv: "development", siteUrl: "http://localhost:5173", secret: "1x0000000000000000000000000000000AA", success: false, testingKey: true, status: 403 },
    { label: "missing test metadata", appEnv: "development", siteUrl: "http://localhost:5173", secret: "1x0000000000000000000000000000000AA", success: true, testingKey: undefined, status: 200 },
    { label: "production", appEnv: "production", siteUrl: "http://localhost:5173", secret: "1x0000000000000000000000000000000AA", success: true, testingKey: true, status: 403 },
    { label: "missing environment", appEnv: undefined, siteUrl: "http://localhost:5173", secret: "1x0000000000000000000000000000000AA", success: true, testingKey: true, status: 403 },
    { label: "non-local hostname", appEnv: "development", siteUrl: "https://example.com", secret: "1x0000000000000000000000000000000AA", success: true, testingKey: true, status: 403 },
    { label: "real secret", appEnv: "development", siteUrl: "http://localhost:5173", secret: "turnstile-secret", success: true, testingKey: true, status: 403 },
  ])("handles test-key responses in $label", async ({ appEnv, siteUrl, secret, success, testingKey, status }) => {
    const calls: string[] = [];
    const response = await handleContactRequest(
      createRequest(),
      { ...createEnvironment(), APP_ENV: appEnv, SITE_URL: siteUrl, TURNSTILE_SECRET_KEY: secret },
      async (input) => {
        calls.push(String(input));
        return String(input).includes("siteverify")
          ? Response.json({ success, hostname: "example.com", metadata: { result_with_testing_key: testingKey } })
          : Response.json({ id: "email-id" });
      },
    );
    expect(response.status).toBe(status);
    expect(calls).toHaveLength(status === 200 ? 2 : 1);
  });

  test.each([
    { hostname: "other.example.com", action: "contact_submit" },
    { hostname: "tomo-site.page", action: "other_action" },
    { hostname: "tomo-site.page" },
  ])("rejects invalid production verification: %j", async (result) => {
    let fetchCount = 0;
    const response = await handleContactRequest(createRequest(), createEnvironment(), async () => {
      fetchCount += 1;
      return Response.json({ success: true, ...result });
    });
    expect(response.status).toBe(403);
    expect(fetchCount).toBe(1);
  });

  test("verifies Turnstile and sends the contact email", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });

      if (url.includes("siteverify")) {
        return Response.json({
          success: true,
          hostname: "tomo-site.page",
          action: "contact_submit",
        });
      }
      return Response.json({ id: "email-id" });
    };

    const response = await handleContactRequest(
      createRequest(),
      createEnvironment(),
      fetcher,
    );

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      from: "TOMO Website <contact@tomo-site.page>",
      to: ["owner@example.com"],
      reply_to: "taro@example.com",
      subject: "[TOMO] 新しいお問い合わせ",
      text: buildContactEmailText(validInput),
    });
  });

  test("reuses the email key and body after a timeout with a fresh Turnstile token", async () => {
    const emails: Array<{ key: string | null; body: string }> = [];
    const tokens: Array<string | null> = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("siteverify")) {
        tokens.push(new URLSearchParams(String(init?.body)).get("response"));
        return Response.json({
          success: true,
          hostname: "tomo-site.page",
          action: "contact_submit",
        });
      }
      emails.push({
        key: new Headers(init?.headers).get("Idempotency-Key"),
        body: String(init?.body),
      });
      if (emails.length === 1) throw new DOMException("Timed out", "TimeoutError");
      return Response.json({ id: "email-id" });
    };

    const first = await handleContactRequest(createRequest(), createEnvironment(), fetcher);
    const retry = await handleContactRequest(
      createRequest({ ...validInput, turnstileToken: "fresh-token" }),
      createEnvironment(),
      fetcher,
    );

    expect(first.status).toBe(500);
    expect(retry.status).toBe(200);
    expect(tokens).toEqual(["valid-token", "fresh-token"]);
    expect(emails).toHaveLength(2);
    expect(emails[0]?.key).toBe(`contact/${validInput.submissionId}`);
    expect(emails[1]).toEqual(emails[0]);
  });

  test.each([
    { email: "invalid" },
    { submissionId: undefined },
    { submissionId: "invalid" },
  ])("rejects invalid input: %j", async (invalidFields) => {
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount += 1;
      return Response.json({ success: true });
    };

    const response = await handleContactRequest(
      createRequest({ ...validInput, ...invalidFields }),
      createEnvironment(),
      fetcher,
    );

    expect(response.status).toBe(400);
    expect(fetchCount).toBe(0);
  });

  test("rejects a failed Turnstile verification", async () => {
    const fetcher = async () => Response.json({ success: false });

    const response = await handleContactRequest(
      createRequest(),
      createEnvironment(),
      fetcher,
    );

    expect(response.status).toBe(403);
  });

  test("rejects a rate-limited request before external calls", async () => {
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount += 1;
      return Response.json({ success: true });
    };

    const response = await handleContactRequest(
      createRequest(),
      createEnvironment(false),
      fetcher,
    );

    expect(response.status).toBe(429);
    expect(fetchCount).toBe(0);
  });

  test("does not expose internal details when Resend fails", async () => {
    const fetcher = async (input: RequestInfo | URL) => {
      if (String(input).includes("siteverify")) {
        return Response.json({
          success: true,
          hostname: "tomo-site.page",
          action: "contact_submit",
        });
      }
      return new Response("provider details", { status: 500 });
    };

    const response = await handleContactRequest(
      createRequest(),
      createEnvironment(),
      fetcher,
    );
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).toBe('{"success":false}');
    expect(body).not.toContain("provider details");
    expect(body).not.toContain("resend-secret");
    expect(body).not.toContain("turnstile-secret");
  });
});
