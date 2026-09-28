import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPage } from "@/features/privacy/PrivacyPage";
import { createSeoHead, SITE_TITLE } from "@/lib/seo";
import { getPublicSiteUrl } from "@/lib/site.functions";

export const Route = createFileRoute("/(public)/privacy")({
  loader: async () => ({ siteUrl: await getPublicSiteUrl() }),
  head: ({ loaderData }) => loaderData ? createSeoHead({
    siteUrl: loaderData.siteUrl,
    path: "/privacy",
    title: `${SITE_TITLE} | PRIVACY POLICY`,
    description: "TOMOのプライバシーポリシー。お問い合わせで取得する個人情報の利用目的、外部サービスの利用、保管・管理方法、お問い合わせ窓口についてご案内します。",
  }) : {},
  component: PrivacyPage,
});
