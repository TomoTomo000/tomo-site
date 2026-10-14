import { z } from "zod";
import {
  PublishError,
  publishInputSchema,
  publisherJson,
  publisherRequest,
  type HttpClient,
  type Publisher,
} from "./publisher";

const itemIdSchema = z.string().regex(/^[0-9a-f]{20}$/);
const itemSchema = z.object({ id: itemIdSchema, url: z.url() });

export function qiitaPublisher(
  config: { token: string },
  http: HttpClient,
): Publisher {
  if (!config.token.trim()) throw new Error("Qiitaトークンが未設定です。");
  return async (input) => {
    const parsed = publishInputSchema.safeParse(input);
    if (!parsed.success)
      throw new PublishError(
        "INVALID_INPUT",
        "タイトル・本文・タグなどの設定を確認してください。",
        "blocked",
      );
    const value = parsed.data;
    if (value.remoteId && !itemIdSchema.safeParse(value.remoteId).success)
      throw new PublishError(
        "INVALID_REMOTE_ID",
        "保存されたQiitaの記事IDが不正です。",
        "blocked",
      );
    const creating = value.remoteId === null;
    const response = await publisherRequest(
      http,
      `https://qiita.com/api/v2/items${creating ? "" : `/${value.remoteId}`}`,
      {
        method: creating ? "POST" : "PATCH",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          title: value.title,
          body: value.markdown,
          tags: value.tags.map((name) => ({ name, versions: [] })),
          private: false,
        }),
      },
      { nonIdempotent: creating, missingRemote: !creating },
    );
    const item = itemSchema.safeParse(await publisherJson(response, creating));
    if (!item.success || (!creating && item.data.id !== value.remoteId))
      throw new PublishError(
        creating ? "OUTCOME_UNKNOWN" : "INVALID_RESPONSE",
        "Qiitaの投稿結果を確認できませんでした。",
        creating ? "unknown" : "blocked",
      );
    const url = new URL(item.data.url);
    if (
      url.origin !== "https://qiita.com" ||
      !url.pathname.endsWith(`/items/${item.data.id}`)
    )
      throw new PublishError(
        "OUTCOME_UNKNOWN",
        "Qiitaの投稿URLを確認できませんでした。",
        "unknown",
      );
    return {
      status: "synced",
      remoteId: item.data.id,
      remoteUrl: item.data.url,
    };
  };
}
