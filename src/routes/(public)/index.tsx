import { createFileRoute } from "@tanstack/react-router";
import { PortfolioPage } from "@/features/portfolio/PortfolioPage";
import { getLatestPublicPosts } from "@/features/blog/server/post.functions";
import { getPublicSiteUrl } from "@/lib/site.functions";
import {
  createSeoHead,
  serializeJsonLd,
  SITE_DESCRIPTION,
  SITE_TITLE,
} from "@/lib/seo";
import pageCss from "@/styles/pages/portfolio.scss?url";

export const Route = createFileRoute("/(public)/")({
  staticData: { pageStylesheet: pageCss },
  loader: async () => {
    const [blogPosts, siteUrl] = await Promise.all([
      getLatestPublicPosts(),
      getPublicSiteUrl(),
    ]);
    return { blogPosts, siteUrl };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const seo = createSeoHead({
      siteUrl: loaderData.siteUrl,
      path: "/",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
    });
    return {
      ...seo,
      links: seo.links,
      scripts: [
        {
          type: "application/ld+json",
          children: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "TOMO",
            url: `${loaderData.siteUrl}/`,
            inLanguage: "ja",
            description: SITE_DESCRIPTION,
          }),
        },
      ],
    };
  },
  component: Home,
});

function Home() {
  const { blogPosts } = Route.useLoaderData();
  return <PortfolioPage blogPosts={blogPosts} />;
}
