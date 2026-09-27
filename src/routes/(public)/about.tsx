import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/features/about/AboutPage";
import { getPublicSiteUrl } from "@/lib/site.functions";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/(public)/about")({
  loader: async () => ({ siteUrl: await getPublicSiteUrl() }),
  head: ({ loaderData }) => loaderData ? createSeoHead({
    siteUrl: loaderData.siteUrl,
    path: "/about",
    title: "TOMO | フロントエンドエンジニア・WEBデザイナー | ABOUT",
    description: "フロントエンドエンジニア・WEBデザイナーTOMOのプロフィール。使用する技術、制作で大切にしていることや好きなものを紹介します。",
  }) : {},
  component: AboutPage,
});
