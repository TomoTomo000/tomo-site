import { contactSchema, type ContactInput } from "./contact.schema";
import { budgetLabels } from "./contact.constants";

const TURNSTILE_ACTION = "contact_submit";
const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
const REQUEST_TIMEOUT_MS = 8_000;

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type RateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export type ContactEnvironment = {
  APP_ENV?: string;
  SITE_URL?: string;
  CONTACT_FROM_EMAIL?: string;
  CONTACT_TO_EMAIL?: string;
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  CONTACT_RATE_LIMITER?: RateLimiter;
};

type ContactConfiguration = {
  allowTestKey: boolean;
  expectedHostname: string;
  fromEmail: string;
  toEmail: string;
  resendApiKey: string;
  turnstileSecretKey: string;
  rateLimiter: RateLimiter;
};

function json(success: boolean, status: number): Response {
  return Response.json(
    { success },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function getConfiguration(
  environment: ContactEnvironment,
): ContactConfiguration | null {
  const siteUrl = environment.SITE_URL?.trim();
  const fromEmail = environment.CONTACT_FROM_EMAIL?.trim();
  const toEmail = environment.CONTACT_TO_EMAIL?.trim();
  const resendApiKey = environment.RESEND_API_KEY?.trim();
  const turnstileSecretKey = environment.TURNSTILE_SECRET_KEY?.trim();
  const rateLimiter = environment.CONTACT_RATE_LIMITER;

  if (
    !siteUrl ||
    !fromEmail ||
    !toEmail ||
    !resendApiKey ||
    !turnstileSecretKey ||
    !rateLimiter
  ) {
    return null;
  }

  try {
    const expectedHostname = new URL(siteUrl).hostname;
    return {
      allowTestKey:
        environment.APP_ENV === "development" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(expectedHostname) &&
        turnstileSecretKey === TURNSTILE_TEST_SECRET_KEY,
      expectedHostname,
      fromEmail,
      toEmail,
      resendApiKey,
      turnstileSecretKey,
      rateLimiter,
    };
  } catch {
    return null;
  }
}

async function verifyTurnstile(
  token: string,
  clientIp: string | null,
  configuration: ContactConfiguration,
  fetcher: Fetcher,
): Promise<boolean> {
  const body = new URLSearchParams({
    secret: configuration.turnstileSecretKey,
    response: token,
  });
  if (clientIp) body.set("remoteip", clientIp);

  try {
    const response = await fetcher(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    if (!response.ok) return false;

    const result = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
    };
    if (result.success !== true) return false;

    // テスト用の応答には、実際のフォームのhostnameやactionが反映されない。
    // ローカル開発で公式テスト用シークレットキーを使う場合のみ、successだけで判定する。
    if (configuration.allowTestKey) {
      return true;
    }
    return (
      result.hostname === configuration.expectedHostname &&
      result.action === TURNSTILE_ACTION
    );
  } catch {
    return false;
  }
}

export function buildContactEmailText(input: ContactInput): string {
  return [
    "ポートフォリオサイトからお問い合わせが届きました。",
    "",
    `お名前: ${input.name}`,
    `メールアドレス: ${input.email}`,
    `ご予算: ${budgetLabels[input.budget]}`,
    "",
    "お問い合わせ内容:",
    input.message,
  ].join("\n");
}

async function sendContactEmail(
  input: ContactInput,
  configuration: ContactConfiguration,
  fetcher: Fetcher,
): Promise<boolean> {
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `contact/${input.submissionId}`,
      },
      body: JSON.stringify({
        from: configuration.fromEmail,
        to: [configuration.toEmail],
        reply_to: input.email,
        subject: "[TOMO] 新しいお問い合わせ",
        text: buildContactEmailText(input),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function handleContactRequest(
  request: Request,
  environment: ContactEnvironment,
  fetcher: Fetcher = fetch,
): Promise<Response> {
  if (request.method !== "POST") return json(false, 405);
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    return json(false, 415);
  }

  // Preview URLs vary by branch; verify Turnstile against the URL serving this request.
  const configuration = getConfiguration(
    environment.APP_ENV === "preview"
      ? { ...environment, SITE_URL: new URL(request.url).origin }
      : environment,
  );
  if (!configuration) {
    console.error("Contact service is not configured");
    return json(false, 500);
  }

  const clientIp = request.headers.get("CF-Connecting-IP");
  let rateLimit: { success: boolean };
  try {
    rateLimit = await configuration.rateLimiter.limit({
      key: clientIp ?? "unknown",
    });
  } catch {
    console.error("Contact rate limiter failed");
    return json(false, 500);
  }
  if (!rateLimit.success) return json(false, 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(false, 400);
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return json(false, 400);

  const verified = await verifyTurnstile(
    parsed.data.turnstileToken,
    clientIp,
    configuration,
    fetcher,
  );
  if (!verified) return json(false, 403);

  if (!(await sendContactEmail(parsed.data, configuration, fetcher))) {
    console.error("Contact email delivery failed");
    return json(false, 500);
  }

  return json(true, 200);
}
