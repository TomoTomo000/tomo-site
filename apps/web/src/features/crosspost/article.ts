export type CrosspostArticle = {
  source: { provider: string; contentId: string };
  sourceUrl: string;
  title: string;
  bodyHtml: string;
  tags: string[];
  publishedAt: string | null;
  revision: string;
  settings: {
    syncZenn: boolean;
    syncQiita: boolean;
    emoji: string;
    zennType: "tech" | "idea";
  };
};
