export type Work = {
  slug: string;
  title: string;
  description: string;
  image: { src: string; alt: string; width: number; height: number };
  overview: string[];
  details: { label: string; value: string }[];
  technologies: string[];
  siteUrl?: string;
};

// 表示したい順に追加。先頭3件がトップページ、全件が一覧に表示されます。
export const works: Work[] = [
  {
    slug: "tomo-site",
    title: "TOMO.（当サイト）",
    description: "プロフィールや制作実績、日々の学びをまとめた個人ポートフォリオサイトです。",
    image: {
      src: "/img/works/tomo-site-desktop.webp",
      alt: "サイトイメージ",
      width: 1440,
      height: 900,
    },
    overview: [
      "自己紹介や制作実績、日々の制作で学んだことをまとめる場所として、個人のポートフォリオサイトを制作しました。",
      "ブラウンとアイボリーを基調に、シンプルで落ち着きのある雰囲気とテキストやアニメーションでポップな印象を両立させるデザインにしてみました。",
      "デザインやコード、好きなものについて気軽に発信できるよう、ブログ機能も追加しています。",
    ],
    details: [
      { label: "制作種別", value: "個人制作 / ポートフォリオサイト" },
      { label: "担当範囲", value: "サイト設計・デザイン・フロントエンド実装" },
      { label: "主な機能", value: "ブログ・記事検索・タグによる絞り込み・お問い合わせ" },
    ],
    technologies: ["TanStack Start", "React", "TypeScript", "Tailwind CSS", "microCMS", "Cloudflare Workers"],
    siteUrl: "/",
  },
];

export function getWorkBySlug(slug: string) {
  return works.find((work) => work.slug === slug);
}

export function getWorkPath(slug: string) {
  return `/works/${encodeURIComponent(slug)}`;
}
