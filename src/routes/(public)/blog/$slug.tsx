import { createFileRoute } from "@tanstack/react-router";
import { BlogArticlePage } from "@/features/blog/components/BlogArticlePage";
import { getPublicPostPageData } from "@/features/blog/server/post.functions";
import { createSeoHead, serializeJsonLd, SITE_DESCRIPTION } from "@/lib/seo";
import { BLOG_OG_HEIGHT, BLOG_OG_WIDTH, getBlogOgImagePath } from "@/features/blog/og-image";

export const Route = createFileRoute("/(public)/blog/$slug")({
  loader: ({ params }) => getPublicPostPageData({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { post, siteUrl } = loaderData;
    const pageUrl = `${siteUrl}/blog/${encodeURIComponent(post.slug)}`;
    const imageUrl = new URL(getBlogOgImagePath(post.slug, post.updatedAt), siteUrl).href;
    const seo = createSeoHead({
      siteUrl,
      path: `/blog/${encodeURIComponent(post.slug)}`,
      title: post.title,
      description: post.description,
      type: "article",
      image: {
        url: imageUrl,
        alt: post.title,
        width: BLOG_OG_WIDTH,
        height: BLOG_OG_HEIGHT,
      },
    });
    const structuredData = serializeJsonLd({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description || SITE_DESCRIPTION,
      image: imageUrl,
      datePublished: post.publishedAt ?? undefined,
      dateModified: post.updatedAt,
      mainEntityOfPage: pageUrl,
      author: { "@type": "Person", name: "TOMO", url: `${siteUrl}/about` },
      publisher: { "@type": "Person", name: "TOMO" },
      inLanguage: "ja",
    });

    return {
      meta: [
        ...seo.meta,
        ...(post.publishedAt
          ? [{ property: "article:published_time", content: post.publishedAt }]
          : []),
        { property: "article:modified_time", content: post.updatedAt },
      ],
      links: seo.links,
      scripts: [{ type: "application/ld+json", children: structuredData }],
    };
  },
  component: BlogPostRoute,
});

function BlogPostRoute() {
  return <BlogArticlePage post={Route.useLoaderData().post} />;
}
