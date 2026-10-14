import type { CrosspostArticle } from "./article";
import { publishArticle, type SyncResult } from "./publish-article";

/** 保存した通知の処理・再処理で共用する。CMSの形式はここに持ち込まない。 */
export async function syncSourceArticle(
  contentId: string,
  source: (id: string) => Promise<CrosspostArticle | null>,
  store: Parameters<typeof publishArticle>[1],
  publishers: Parameters<typeof publishArticle>[2],
  options: Parameters<typeof publishArticle>[3] = {},
): Promise<SyncResult[]> {
  const article = await source(contentId);
  if (!article) return []; // 公開終了・削除後は投稿先に触れない。
  return publishArticle(article, store, publishers, options);
}
