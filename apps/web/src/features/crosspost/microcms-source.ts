import { z } from "zod";
import { SyncError } from "./sync-error";
import type { CrosspostArticle } from "./article";
import {
  crosspostArticleFromMicroCms,
  microCmsCrosspostFields,
} from "./microcms-article";
import type { HttpClient } from "./publishers/publisher";

export const microCmsContentId = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);

/** 下書きキーは受け取らず、公開用APIから毎回取得する。 */
export function microCmsSource(
  config: { service: string; apiKey: string; siteUrl: string },
  http: HttpClient,
): (id: string) => Promise<CrosspostArticle | null> {
  const service = z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/)
    .parse(config.service);
  const apiKey = z.string().trim().min(1).parse(config.apiKey);
  const site = new URL(config.siteUrl);
  if (!/^https?:$/.test(site.protocol) || site.username || site.password)
    throw new Error("サイトURLが不正です。");

  return async (id) => {
    microCmsContentId.parse(id);
    const url = new URL(`https://${service}.microcms.io/api/v1/blog/${id}`);
    url.searchParams.set("fields", microCmsCrosspostFields);
    url.searchParams.set("depth", "1");
    let response: Response;
    try {
      response = await http(url.href, {
        method: "GET",
        headers: { "X-MICROCMS-API-KEY": apiKey },
        // Workersはredirect: "error"に非対応。3xxは下のresponse.okで拒否する。
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch {
      throw new SyncError("SOURCE_NETWORK");
    }
    if (response.status === 404) return null;
    if (!response.ok)
      throw new SyncError(
        `SOURCE_HTTP_${response.status}`,
        response.status === 429 || response.status >= 500,
      );
    try {
      const article = crosspostArticleFromMicroCms(
        await response.json(),
        site.href,
      );
      if (article.source.contentId !== id)
        throw new Error("記事IDが一致しません。");
      return article.publishedAt ? article : null;
    } catch {
      // APIレスポンスや認証情報をエラーに含めない。
      throw new SyncError("SOURCE_INVALID_DATA", false);
    }
  };
}
