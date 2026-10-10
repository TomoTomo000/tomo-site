import type { APIRoute } from "astro";
import { getSiteUrl } from "@/lib/site-url.server";

export const GET: APIRoute = ({ request }) =>
  new Response(
    `User-agent: *\nAllow: /\nDisallow: /blog/preview/\nSitemap: ${getSiteUrl(request)}/sitemap.xml\n`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
