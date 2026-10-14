import { Buffer } from "node:buffer";
import { z } from "zod";
import {
  PublishError,
  publishInputSchema,
  publisherJson,
  publisherRequest,
  type HttpClient,
  type Publisher,
  type PublishInput,
} from "./publisher";

const slugSchema = z.string().regex(/^[a-z0-9_-]{12,50}$/);
const repositorySchema = z.object({
  token: z.string().trim().min(1),
  owner: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  repository: z
    .string()
    .regex(/^[a-zA-Z0-9_.-]+$/)
    .refine((value) => value !== "." && value !== ".."),
  branch: z.string().min(1),
  username: z.string().regex(/^[a-zA-Z0-9_-]+$/),
});

/** 掲載終了用。実行前にDBの同期を停止すること。404でもブランチの実在を確認する。 */
export function zennFileRemoval(
  inputConfig: z.infer<typeof repositorySchema>,
  http: HttpClient,
) {
  const config = repositorySchema.parse(inputConfig);
  return async (remoteId: string): Promise<void> => {
    const slug = slugSchema.parse(remoteId);
    const base = `https://api.github.com/repos/${config.owner}/${config.repository}`;
    const headers = {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
      "User-Agent": "tomo-site-crosspost",
    };
    const endpoint = `${base}/contents/articles/${slug}.md`;
    const existing = await publisherRequest(
      http,
      `${endpoint}?ref=${encodeURIComponent(config.branch)}`,
      { method: "GET", headers },
      { allowNotFound: true },
    );
    if (existing.status === 404) {
      // リポジトリ・ブランチの設定間違いや権限不足を「削除済み」と扱わない。
      await publisherRequest(
        http,
        `${base}/branches/${encodeURIComponent(config.branch)}`,
        { method: "GET", headers },
      );
      return;
    }
    const file = z
      .object({ type: z.literal("file"), sha: z.string().min(1) })
      .safeParse(await publisherJson(existing, false));
    if (!file.success)
      throw new PublishError(
        "INVALID_RESPONSE",
        "削除対象ファイルを確認できませんでした。",
        "blocked",
      );
    await publisherRequest(http, endpoint, {
      method: "DELETE",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Stop publishing ${slug}`,
        branch: config.branch,
        sha: file.data.sha,
      }),
    });
    // 応答不明や競合の場合も自動再送しない。再実行時にGETで確認する。
  };
}

export function zennDocument(input: PublishInput): string {
  // JSONの文字列・配列はYAMLとしても有効。タイトル中の改行や引用符をそのまま連結しない。
  return [
    "---",
    `title: ${JSON.stringify(input.title)}`,
    `emoji: ${JSON.stringify(input.emoji)}`,
    `type: ${JSON.stringify(input.zennType)}`,
    `topics: ${JSON.stringify(input.tags)}`,
    "published: true",
    "---",
    "",
    input.markdown,
  ].join("\n");
}

export function zennPublisher(
  inputConfig: z.infer<typeof repositorySchema>,
  http: HttpClient,
): Publisher {
  const config = repositorySchema.parse(inputConfig);
  return async (input) => {
    const parsed = publishInputSchema.safeParse(input);
    if (!parsed.success)
      throw new PublishError(
        "INVALID_INPUT",
        "タイトル・本文・タグなどの設定を確認してください。",
        "blocked",
      );
    const value = parsed.data;
    const slug = value.remoteId ?? `tomo-${value.articleId}`;
    if (!slugSchema.safeParse(slug).success)
      throw new PublishError(
        "INVALID_REMOTE_ID",
        "保存されたZennの識別子が不正です。",
        "blocked",
      );
    const endpoint = `https://api.github.com/repos/${config.owner}/${config.repository}/contents/articles/${slug}.md`;
    const headers = {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
      "User-Agent": "tomo-site-crosspost",
    };
    const existing = await publisherRequest(
      http,
      `${endpoint}?ref=${encodeURIComponent(config.branch)}`,
      { method: "GET", headers },
      { allowNotFound: true },
    );
    let sha: string | undefined;
    if (existing.status === 404) {
      if (value.remoteId)
        throw new PublishError(
          "REMOTE_NOT_FOUND",
          "Zenn連携ファイルが見つかりません。自動再作成は停止しました。",
          "missing_remote",
        );
    } else {
      if (!value.remoteId)
        throw new PublishError(
          "FILE_EXISTS",
          "同名のZenn連携ファイルが存在します。紐付けの確認が必要です。",
          "blocked",
        );
      const file = z
        .object({ type: z.literal("file"), sha: z.string().min(1) })
        .safeParse(await publisherJson(existing, false));
      if (!file.success)
        throw new PublishError(
          "INVALID_RESPONSE",
          "Zenn連携ファイルを確認できませんでした。",
          "blocked",
        );
      sha = file.data.sha;
    }
    const response = await publisherRequest(
      http,
      endpoint,
      {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Sync article ${slug}`,
          content: Buffer.from(zennDocument(value), "utf8").toString("base64"),
          branch: config.branch,
          ...(sha ? { sha } : {}),
        }),
      },
      { nonIdempotent: true },
    );
    // PUTの応答が不明なら再作成せず、GitHub上のファイルを確認してから復旧する。
    const result = z
      .object({
        content: z.object({ sha: z.string().min(1) }),
        commit: z.object({ sha: z.string().min(1) }),
      })
      .safeParse(await publisherJson(response, true));
    if (!result.success)
      throw new PublishError(
        "OUTCOME_UNKNOWN",
        "GitHubへの送信結果を確認できませんでした。",
        "unknown",
      );
    return {
      status: "submitted",
      remoteId: slug,
      remoteUrl: `https://zenn.dev/${config.username}/articles/${slug}`,
    };
  };
}
