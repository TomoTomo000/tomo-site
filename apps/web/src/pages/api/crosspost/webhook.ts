import type { APIRoute } from "astro";
import { receiveCrosspost } from "@/features/crosspost/runtime.server";
import { getCloudflareEnv } from "@/lib/cloudflare/env.server";
export const POST: APIRoute = ({ request }) =>
  receiveCrosspost(request, getCloudflareEnv());
