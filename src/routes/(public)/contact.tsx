import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/features/contact/ContactPage";
import { createSeoHead, SITE_TITLE } from "@/lib/seo";
import { getPublicSiteUrl } from "@/lib/site.functions";

export const Route = createFileRoute("/(public)/contact")({
  loader: async () => ({ siteUrl: await getPublicSiteUrl() }),
  head: ({ loaderData }) => loaderData ? createSeoHead({
    siteUrl: loaderData.siteUrl,
    path: "/contact",
    title: `${SITE_TITLE} | CONTACT`,
    description: "フロントエンドエンジニア・WEBデザイナーTOMOへのお問い合わせ。WEB制作・デザインのご相談やお仕事のご依頼を受け付けています。",
  }) : {},
  component: ContactPage,
});
