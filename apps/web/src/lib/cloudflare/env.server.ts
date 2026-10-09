import { env } from "cloudflare:workers";

export type AppEnv = Omit<Cloudflare.Env, "APP_ENV"> & {
  APP_ENV: "development" | "production" | "test";
  SITE_URL?: string;
  MICROCMS_SERVICE_DOMAIN?: string;
  MICROCMS_API_KEY?: string;
  MICROCMS_PREVIEW_SECRET?: string;
  CONTACT_FROM_EMAIL?: string;
  CONTACT_TO_EMAIL?: string;
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  CONTACT_RATE_LIMITER?: RateLimit;
};

export function getCloudflareEnv(): AppEnv {
  return env as AppEnv;
}
