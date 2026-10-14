import { z } from "zod";

export const publishInputSchema = z.object({
  articleId: z.uuid(),
  remoteId: z.string().min(1).max(100).nullable(),
  title: z.string().trim().min(1).max(160),
  markdown: z.string().min(1),
  tags: z.array(z.string().trim().min(1).max(60)).min(1).max(5),
  emoji: z.string().min(1).max(32),
  zennType: z.enum(["tech", "idea"]),
});
export type PublishInput = z.infer<typeof publishInputSchema>;
export type PublishResult = {
  status: "synced" | "submitted";
  remoteId: string;
  remoteUrl: string;
};
export type Publisher = (input: PublishInput) => Promise<PublishResult>;
export type HttpClient = (url: string, init: RequestInit) => Promise<Response>;

export class PublishError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly disposition:
      "retry" | "blocked" | "missing_remote" | "unknown",
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "PublishError";
  }
}

/** 本文・トークン・サービスからの生のエラーはログや保存データに含めない。 */
export async function publisherRequest(
  http: HttpClient,
  url: string,
  init: RequestInit,
  options: {
    nonIdempotent?: boolean;
    allowNotFound?: boolean;
    missingRemote?: boolean;
  } = {},
): Promise<Response> {
  let response: Response;
  try {
    response = await http(url, {
      ...init,
      // 認証ヘッダーを転送先へ送らず、3xxはHTTPエラーとして扱う。
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new PublishError(
      options.nonIdempotent ? "OUTCOME_UNKNOWN" : "NETWORK",
      options.nonIdempotent
        ? "投稿結果が不明です。重複を避けるため確認が必要です。"
        : "通信に失敗しました。",
      options.nonIdempotent ? "unknown" : "retry",
    );
  }
  if (response.ok || (options.allowNotFound && response.status === 404))
    return response;
  const retryHeader = response.headers.get("retry-after");
  const retrySeconds =
    retryHeader === null
      ? undefined
      : /^\d+$/.test(retryHeader)
        ? Number(retryHeader)
        : Math.max(0, Math.ceil((Date.parse(retryHeader) - Date.now()) / 1000));
  const retryAfter =
    retrySeconds !== undefined && Number.isFinite(retrySeconds)
      ? retrySeconds
      : undefined;
  if (
    response.status === 429 ||
    (response.status === 403 &&
      (retryAfter !== undefined ||
        response.headers.get("x-ratelimit-remaining") === "0"))
  ) {
    throw new PublishError(
      "RATE_LIMIT",
      "利用制限のため再試行待ちです。",
      "retry",
      retryAfter ?? 60,
    );
  }
  if (response.status >= 500 || response.status === 408) {
    throw new PublishError(
      options.nonIdempotent ? "OUTCOME_UNKNOWN" : "TEMPORARY",
      options.nonIdempotent
        ? "投稿結果が不明です。重複を避けるため確認が必要です。"
        : "投稿先で一時的なエラーが発生しました。",
      options.nonIdempotent ? "unknown" : "retry",
    );
  }
  if (response.status === 404 && options.missingRemote)
    throw new PublishError(
      "REMOTE_NOT_FOUND",
      "投稿済みの記事が見つかりません。自動再投稿は停止しました。",
      "missing_remote",
    );
  if (response.status === 409)
    throw new PublishError("CONFLICT", "投稿先の変更と競合しました。", "retry");
  throw new PublishError(
    `HTTP_${response.status}`,
    response.status === 401 || response.status === 403
      ? "投稿先の認証・権限を確認してください。"
      : "投稿先の設定または入力内容を確認してください。",
    "blocked",
  );
}

export async function publisherJson(
  response: Response,
  nonIdempotent: boolean,
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new PublishError(
      nonIdempotent ? "OUTCOME_UNKNOWN" : "INVALID_RESPONSE",
      "送信結果を読み取れませんでした。確認が必要です。",
      nonIdempotent ? "unknown" : "blocked",
    );
  }
}
