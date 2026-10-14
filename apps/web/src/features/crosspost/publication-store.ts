import { z } from "zod";

// D1の必要なメソッドだけに依存し、CMSやWorkersのグローバルには依存しない。
type SqlValue = string | number | null;
interface Statement {
  bind(...values: SqlValue[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
}
export interface CrosspostDatabase {
  prepare(sql: string): Statement;
}

const targetSchema = z.enum(["zenn", "qiita"]);
const statusSchema = z.enum([
  "idle",
  "pending",
  "syncing",
  "submitted",
  "synced",
  "simplified",
  "failed",
  "blocked",
  "paused",
  "missing_remote",
]);
const urlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return /^https?:$/.test(url.protocol) && !url.username && !url.password;
});
const sourceSchema = z.object({
  provider: z.string().min(1).max(100),
  contentId: z.string().min(1).max(100),
});

export type PublicationTarget = z.infer<typeof targetSchema>;
export type PublicationStatus = z.infer<typeof statusSchema>;
export type StoredArticle = {
  id: string;
  sourceProvider: string;
  sourceContentId: string;
  sourceUrl: string;
};
export type Publication = {
  articleId: string;
  target: PublicationTarget;
  remoteId: string | null;
  remoteUrl: string | null;
  status: PublicationStatus;
  lastAttemptHash: string | null;
  lastSyncedHash: string | null;
  lastSyncedAt: string | null;
  warnings: string[];
  errorCode: string | null;
  errorMessage: string | null;
  nextRetryAt: string | null;
  revision: number;
  updatedAt: string;
};

const articleColumns = `id, source_provider AS sourceProvider, source_content_id AS sourceContentId, source_url AS sourceUrl`;
const publicationColumns = `article_id AS articleId, target, remote_id AS remoteId,
  remote_url AS remoteUrl, status, last_attempt_hash AS lastAttemptHash,
  last_synced_hash AS lastSyncedHash, last_synced_at AS lastSyncedAt,
  warnings_json AS warningsJson, error_code AS errorCode, error_message AS errorMessage,
  next_retry_at AS nextRetryAt, revision, updated_at AS updatedAt`;
type PublicationRow = Omit<Publication, "warnings"> & { warningsJson: string };
function publication(row: PublicationRow): Publication {
  const { warningsJson, ...rest } = row;
  return {
    ...rest,
    warnings: z.array(z.string()).parse(JSON.parse(warningsJson)),
  };
}

const saveSchema = z
  .object({
    articleId: z.uuid(),
    target: targetSchema,
    expectedRevision: z.number().int().nonnegative(),
    nextRetryAt: z.iso.datetime().optional(),
    status: statusSchema,
    remoteId: z.string().min(1).max(100).optional(),
    remoteUrl: urlSchema.optional(),
    contentHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    warnings: z.array(z.string().max(1000)).max(100).default([]),
    error: z
      .object({
        code: z.string().min(1).max(100),
        message: z.string().min(1).max(1000),
      })
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.nextRetryAt && value.status !== "failed")
      context.addIssue({
        code: "custom",
        message: "再試行予定は一時的な失敗時だけ指定できます。",
      });
    if (["synced", "simplified"].includes(value.status) && !value.contentHash)
      context.addIssue({
        code: "custom",
        message: "同期完了には内容のハッシュが必要です。",
      });
    if (
      ["failed", "blocked", "missing_remote"].includes(value.status) &&
      !value.error
    )
      context.addIssue({
        code: "custom",
        message: "停止・失敗の理由が必要です。",
      });
    if (value.status === "simplified" && !value.warnings.length)
      context.addIssue({
        code: "custom",
        message: "簡略化した箇所を記録してください。",
      });
    if (value.status === "synced" && value.warnings.length)
      context.addIssue({
        code: "custom",
        message: "簡略化ありの状態を指定してください。",
      });
    if (
      value.error &&
      !["failed", "blocked", "missing_remote"].includes(value.status)
    )
      context.addIssue({
        code: "custom",
        message: "エラーは停止・失敗時にだけ記録できます。",
      });
  });

export function publicationStore(db: CrosspostDatabase) {
  return {
    /** 送信中には停止できない。停止と送信の取得は同じ行への原子的更新で競合させる。 */
    async stopZenn(source: z.infer<typeof sourceSchema>): Promise<Publication> {
      const value = sourceSchema.parse(source);
      const row = await db
        .prepare(
          `UPDATE crosspost_publications SET status = 'paused',
        revision = revision + 1, next_retry_at = NULL, error_code = NULL, error_message = NULL, updated_at = ?3
        WHERE target = 'zenn' AND article_id = (
          SELECT id FROM crosspost_articles WHERE source_provider = ?1 AND source_content_id = ?2
        ) AND remote_id IS NOT NULL AND status <> 'syncing'
          AND (error_code IS NULL OR error_code <> 'OUTCOME_UNKNOWN')
        RETURNING ${publicationColumns}`,
        )
        .bind(value.provider, value.contentId, new Date().toISOString())
        .first<PublicationRow>();
      if (!row)
        throw new Error(
          "掲載終了できませんでした。未投稿・処理中・投稿結果不明の可能性があります。statusで状態を確認してください。",
        );
      return publication(row);
    },
    async ensureArticle(input: {
      source: z.infer<typeof sourceSchema>;
      sourceUrl: string;
    }): Promise<StoredArticle> {
      const source = sourceSchema.parse(input.source);
      const sourceUrl = urlSchema.parse(input.sourceUrl);
      const now = new Date().toISOString();
      const row = await db
        .prepare(
          `INSERT INTO crosspost_articles
        (id, source_provider, source_content_id, source_url, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?5)
        ON CONFLICT(source_provider, source_content_id) DO UPDATE SET source_url = excluded.source_url, updated_at = excluded.updated_at
        RETURNING ${articleColumns}`,
        )
        .bind(
          crypto.randomUUID(),
          source.provider,
          source.contentId,
          sourceUrl,
          now,
        )
        .first<StoredArticle>();
      if (!row) throw new Error("記事の保存に失敗しました。");
      return row;
    },

    // 移行時のみ呼ぶ。固定IDと外部の記事ID・状態は維持する。
    async changeSource(
      articleId: string,
      source: z.infer<typeof sourceSchema>,
    ): Promise<StoredArticle> {
      z.uuid().parse(articleId);
      const value = sourceSchema.parse(source);
      const row = await db
        .prepare(
          `UPDATE crosspost_articles SET source_provider = ?2, source_content_id = ?3, updated_at = ?4 WHERE id = ?1 RETURNING ${articleColumns}`,
        )
        .bind(
          articleId,
          value.provider,
          value.contentId,
          new Date().toISOString(),
        )
        .first<StoredArticle>();
      if (!row) throw new Error("移行元の記事が見つかりません。");
      return row;
    },

    async ensurePublication(
      articleId: string,
      target: PublicationTarget,
    ): Promise<Publication> {
      z.uuid().parse(articleId);
      targetSchema.parse(target);
      // 重複呼び出しで外部IDや停止状態をリセットしない。
      await db
        .prepare(
          `INSERT INTO crosspost_publications (article_id, target, updated_at)
        VALUES (?1, ?2, ?3) ON CONFLICT(article_id, target) DO NOTHING RETURNING article_id`,
        )
        .bind(articleId, target, new Date().toISOString())
        .first();
      const row = await db
        .prepare(
          `SELECT ${publicationColumns} FROM crosspost_publications WHERE article_id = ?1 AND target = ?2`,
        )
        .bind(articleId, target)
        .first<PublicationRow>();
      if (!row) throw new Error("同期状態の保存に失敗しました。");
      return publication(row);
    },

    async listPublications(articleId: string): Promise<Publication[]> {
      z.uuid().parse(articleId);
      const rows = await db
        .prepare(
          `SELECT ${publicationColumns} FROM crosspost_publications WHERE article_id = ?1 ORDER BY target`,
        )
        .bind(articleId)
        .all<PublicationRow>();
      return rows.results.map(publication);
    },

    async savePublication(
      input: z.input<typeof saveSchema>,
    ): Promise<Publication> {
      const value = saveSchema.parse(input);
      const now = new Date().toISOString();
      const synced = value.status === "synced" || value.status === "simplified";
      // 古い実行結果で新しい状態を上書きしない。設定済みの外部IDも差し替えない。
      const row = await db
        .prepare(
          `UPDATE crosspost_publications SET
        status = ?4, remote_id = COALESCE(?5, remote_id), remote_url = COALESCE(?6, remote_url),
        last_attempt_hash = COALESCE(?7, last_attempt_hash),
        last_synced_hash = CASE WHEN ?8 = 1 THEN ?7 ELSE last_synced_hash END,
        last_synced_at = CASE WHEN ?8 = 1 THEN ?12 ELSE last_synced_at END,
        warnings_json = ?9, error_code = ?10, error_message = ?11,
        revision = revision + 1, updated_at = ?12, next_retry_at = ?13
        WHERE article_id = ?1 AND target = ?2 AND revision = ?3 AND status <> 'paused'
          AND (remote_id IS NULL OR ?5 IS NULL OR remote_id = ?5)
        RETURNING ${publicationColumns}`,
        )
        .bind(
          value.articleId,
          value.target,
          value.expectedRevision,
          value.status,
          value.remoteId ?? null,
          value.remoteUrl ?? null,
          value.contentHash ?? null,
          synced ? 1 : 0,
          JSON.stringify(value.warnings),
          value.error?.code ?? null,
          value.error?.message ?? null,
          now,
          value.nextRetryAt ?? null,
        )
        .first<PublicationRow>();
      if (!row)
        throw new Error(
          "同期状態が変更されています。最新の状態を取得してください。",
        );
      return publication(row);
    },
  };
}
