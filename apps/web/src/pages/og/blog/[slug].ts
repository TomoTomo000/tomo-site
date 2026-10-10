import type { APIRoute } from "astro";
import { findMicroCmsPostSummaryById } from "@/features/blog/server/microcms.repository.server";
import { renderBlogOgImage } from "@/features/blog/server/og-image.server";
import { isBlogDataError } from "@/features/blog/server/blog-data.error";
import { BLOG_OG_RENDERER_VERSION } from "@/features/blog/og-image";

export const GET: APIRoute = async ({ params, request }) => {
  const errorHeaders = {
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex",
  };
  try {
    // 公開エンドポイントでは、下書きキーや任意のタイトルをパラメーターとして受け付けない。
    const post = await findMicroCmsPostSummaryById(params.slug!);
    if (!post?.publishedAt)
      return new Response("Not found", { status: 404, headers: errorHeaders });
    const cacheUrl = new URL(request.url);
    cacheUrl.search = new URLSearchParams({
      v: post.updatedAt,
      renderer: BLOG_OG_RENDERER_VERSION,
    }).toString();
    const key = new Request(cacheUrl);
    const cache = await caches.open("blog-og-images-v1");
    const cached = await cache.match(key);
    if (cached) return cached;
    const png = await renderBlogOgImage(post.title, request);
    const response = new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
    await cache.put(key, response.clone());
    return response;
  } catch (error) {
    return new Response("Image temporarily unavailable", {
      status: isBlogDataError(error) ? error.status : 503,
      headers: errorHeaders,
    });
  }
};
