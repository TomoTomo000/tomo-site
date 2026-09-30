import { createFileRoute } from "@tanstack/react-router";
import { listMicroCmsFeedPosts } from "@/features/blog/server/microcms.repository.server";
import { getSiteUrl } from "@/lib/site-url.server";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const Route = createFileRoute("/(public)/feed.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const siteUrl = getSiteUrl(request);
        const posts = await listMicroCmsFeedPosts();
        const items = posts
          .map((post) => {
            const url = `${siteUrl}/blog/${encodeURIComponent(post.slug)}`;
            return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${escapeXml(url)}</link>
  <guid isPermaLink="true">${escapeXml(url)}</guid>
  <description>${escapeXml(post.description)}</description>
  ${post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : ""}
</item>`;
          })
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>TOMO BLOG</title>
  <link>${escapeXml(`${siteUrl}/blog`)}</link>
  <description>フロントエンドエンジニア・WEBデザイナーTOMOのブログ。日々の制作で学んだことと、デザイン、コード、好きなものについてのブログです。</description>
  <language>ja</language>
  ${items}
</channel>
</rss>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        });
      },
    },
  },
});
