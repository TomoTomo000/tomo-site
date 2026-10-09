import { createFileRoute } from "@tanstack/react-router";
import { WorksListPage } from "@/features/works/WorksListPage";
import { getPublicSiteUrl } from "@/lib/site.functions";
import { createSeoHead } from "@/lib/seo";
import pageCss from "@/styles/pages/works-list.scss?url";

export const Route = createFileRoute("/(public)/works/")({
  staticData: { pageStylesheet: pageCss },
  loader: async () => ({ siteUrl: await getPublicSiteUrl() }),
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const seo = createSeoHead({
      siteUrl: loaderData.siteUrl,
      path: "/works",
      title: "TOMO | フロントエンドエンジニア・WEBデザイナー | WORKS",
      description:
        "TOMOの制作実績一覧。制作したWEBサイト・アプリケーションと、デザイン・実装で工夫した点などを紹介します。",
    });
    return {
      ...seo,
      links: seo.links,
    };
  },
  component: WorksListPage,
});
