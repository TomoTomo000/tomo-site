import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/features/about/AboutPage";
import { getPublicSiteUrl } from "@/lib/site.functions";
import { createSeoHead } from "@/lib/seo";
import pageCss from "@/styles/pages/about.scss?url";

export const Route = createFileRoute("/(public)/about")({
  staticData: { pageStylesheet: pageCss },
  loader: async () => ({ siteUrl: await getPublicSiteUrl() }),
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const seo = createSeoHead({
      siteUrl: loaderData.siteUrl,
      path: "/about",
      title: "TOMO | フロントエンドエンジニア・WEBデザイナー | ABOUT",
      description:
        "フロントエンドエンジニア・WEBデザイナーTOMOのプロフィール。使用する技術、制作で大切にしていることや好きなものを紹介します。",
    });
    return {
      ...seo,
      links: seo.links,
    };
  },
  component: AboutPage,
});
