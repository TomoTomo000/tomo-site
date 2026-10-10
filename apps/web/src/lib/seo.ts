export const SITE_NAME = "TOMO";
export const SITE_TITLE = "TOMO | フロントエンドエンジニア・WEBデザイナー";
export const SITE_DESCRIPTION =
  "フロントエンドエンジニア・WEBデザイナーTOMOのWEBサイトです。制作実績や日々の学び、コーディング・デザインについての備忘録をまとめています。";

type SeoImage = { url: string; alt: string; width?: number; height?: number };

export const DEFAULT_SEO_IMAGE: SeoImage = {
  url: "/img/ogp-image.png",
  alt: "TOMO — フロントエンドエンジニア・WEBデザイナー",
  width: 1200,
  height: 630,
};

export function createSeoHead(options: {
  siteUrl: string;
  path: string;
  title: string;
  description: string;
  type?: "website" | "article";
  image?: SeoImage;
  noindex?: boolean;
}) {
  const { siteUrl, path, title, type = "website", noindex = false } = options;
  const description = options.description.trim() || SITE_DESCRIPTION;
  const url = new URL(path, siteUrl).href;
  const image = options.image ?? DEFAULT_SEO_IMAGE;
  const imageUrl = new URL(image.url, siteUrl).href;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      {
        name: "robots",
        content: noindex
          ? "noindex,follow"
          : "index,follow,max-image-preview:large",
      },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: "ja_JP" },
      { property: "og:type", content: type },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: imageUrl },
      { property: "og:image:alt", content: image.alt },
      ...(image.width && image.height
        ? [
            { property: "og:image:width", content: String(image.width) },
            { property: "og:image:height", content: String(image.height) },
          ]
        : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: imageUrl },
      { name: "twitter:image:alt", content: image.alt },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
