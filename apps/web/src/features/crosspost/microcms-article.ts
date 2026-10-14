import { z } from "zod";
import { postSchema } from "../blog/server/post.schema";
import type { CrosspostArticle } from "./article";

const emojiSchema = z
  .string()
  .trim()
  .max(32)
  .nullish()
  .transform((value) => value || "📝")
  .refine((value) => {
    const graphemes = [
      ...new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(value),
    ];
    return (
      graphemes.length === 1 &&
      /\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3/u.test(
        value,
      )
    );
  }, "絵文字を1つ指定してください。");

// microCMSのセレクトフィールドは、単一選択でも配列で返る。
export const microCmsCrosspostSettingsSchema = z.object({
  syncZenn: z
    .boolean()
    .nullish()
    .transform((value) => value ?? false),
  syncQiita: z
    .boolean()
    .nullish()
    .transform((value) => value ?? false),
  emoji: emojiSchema,
  zennType: z
    .array(z.enum(["tech", "idea"]))
    .max(1)
    .nullish()
    .transform((value) => value?.[0] ?? "tech"),
});

export const microCmsCrosspostArticleSchema = postSchema
  .pick({
    id: true,
    title: true,
    content: true,
    tags: true,
    updatedAt: true,
    revisedAt: true,
    publishedAt: true,
  })
  .extend({ content: z.string(), ...microCmsCrosspostSettingsSchema.shape });

export const microCmsCrosspostFields = [
  "id",
  "title",
  "content",
  "tags",
  "updatedAt",
  "revisedAt",
  "publishedAt",
  "syncZenn",
  "syncQiita",
  "emoji",
  "zennType",
].join(",");

/** microCMS固有の形式を、同期処理で使う記事データへ変換する。 */
export function crosspostArticleFromMicroCms(
  value: unknown,
  siteUrl: string,
): CrosspostArticle {
  const article = microCmsCrosspostArticleSchema.parse(value);
  const site = new URL(siteUrl);
  if (!/^https?:$/.test(site.protocol) || site.username || site.password)
    throw new Error("サイトURLが不正です。");
  return {
    source: { provider: "microcms", contentId: article.id },
    sourceUrl: new URL(`/blog/${encodeURIComponent(article.id)}`, site).href,
    title: article.title,
    bodyHtml: article.content,
    tags: article.tags.map((tag) => tag.name),
    publishedAt: article.publishedAt ?? null,
    revision: article.revisedAt ?? article.updatedAt,
    settings: {
      syncZenn: article.syncZenn,
      syncQiita: article.syncQiita,
      emoji: article.emoji,
      zennType: article.zennType,
    },
  };
}
