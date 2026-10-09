import type { APIRoute } from "astro";
import { handleContactRequest } from "@/features/contact/contact.server";
import { getCloudflareEnv } from "@/lib/cloudflare/env.server";

export const POST: APIRoute = ({ request }) =>
  handleContactRequest(request, getCloudflareEnv());
