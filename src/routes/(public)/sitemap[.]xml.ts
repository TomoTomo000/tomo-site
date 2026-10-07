import { createFileRoute } from "@tanstack/react-router";
import { listMicroCmsPosts } from "@/features/blog/server/microcms.repository.server";
import { getSiteUrl } from "@/lib/site-url.server";
import { works, getWorkPath } from "@/features/works/works";

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export const Route = createFileRoute("/(public)/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const siteUrl = getSiteUrl(request);
        const firstPage = await listMicroCmsPosts({
          page: 1,
          pageSize: 50,
          query: "",
          tag: "",
        });
        const items = [...firstPage.items];
        for (let page = 2; page <= firstPage.pageCount; page += 1) {
          const nextPage = await listMicroCmsPosts({
            page,
            pageSize: 50,
            query: "",
            tag: "",
          });
          items.push(...nextPage.items);
        }
        const entries = [
          `<url><loc>${escapeXml(`${siteUrl}/`)}</loc></url>`,
          `<url><loc>${escapeXml(`${siteUrl}/about`)}</loc></url>`,
          `<url><loc>${escapeXml(`${siteUrl}/works`)}</loc></url>`,
          ...works.map((work) => `<url><loc>${escapeXml(`${siteUrl}${getWorkPath(work.slug)}`)}</loc></url>`),
          `<url><loc>${escapeXml(`${siteUrl}/blog`)}</loc></url>`,
          `<url><loc>${escapeXml(`${siteUrl}/privacy`)}</loc></url>`,
          `<url><loc>${escapeXml(`${siteUrl}/contact`)}</loc></url>`,
          ...items.map(
            (post) =>
              `<url><loc>${escapeXml(`${siteUrl}/blog/${encodeURIComponent(post.slug)}`)}</loc><lastmod>${escapeXml(post.updatedAt)}</lastmod></url>`,
          ),
        ].join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        });
      },
    },
  },
});
