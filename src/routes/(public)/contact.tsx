import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/features/contact/ContactPage";
import { createSeoHead, SITE_TITLE } from "@/lib/seo";
import { getPublicSiteUrl } from "@/lib/site.functions";
import pageCss from "@/styles/pages/contact.scss?url";

export const Route = createFileRoute("/(public)/contact")({
  staticData: { pageStylesheet: pageCss },
  loader: async () => ({ siteUrl: await getPublicSiteUrl() }),
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const seo = createSeoHead({
      siteUrl: loaderData.siteUrl,
      path: "/contact",
      title: `${SITE_TITLE} | CONTACT`,
      description:
        "フロントエンドエンジニア・WEBデザイナーTOMOへのお問い合わせ。WEB制作・デザインのご相談やお仕事のご依頼を受け付けています。",
    });
    return {
      ...seo,
      links: seo.links,
    };
  },
  component: ContactPage,
});
