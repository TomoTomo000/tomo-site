import { z } from "zod";
import type { CrosspostDatabase } from "./publication-store";

export type CrosspostJob = {
  provider: string;
  contentId: string;
  generation: number;
  status: "pending" | "running" | "done" | "review";
  attempts: number;
  availableAt: string;
  token: string | null;
  errorCode: string | null;
  updatedAt: string;
};
const columns = `provider, content_id AS contentId, generation, status, attempts,
  available_at AS availableAt, token, error_code AS errorCode, updated_at AS updatedAt`;
const identifier = z.string().min(1).max(100);
type Completion = {
  status: "done" | "review" | "pending";
  errorCode?: string;
  retryAt?: string;
};

export function jobStore(db: CrosspostDatabase, now = () => new Date()) {
  return {
    /** 確認待ちだけを再受付。処理中・送信結果不明・削除済みは解除しない。 */
    async retry(provider: string, contentId: string): Promise<boolean> {
      identifier.parse(provider);
      identifier.parse(contentId);
      const row = await db
        .prepare(
          `UPDATE crosspost_jobs SET status = 'pending',
        generation = generation + 1, attempts = 0, error_code = NULL,
        available_at = ?3, updated_at = ?3
        WHERE provider = ?1 AND content_id = ?2 AND status = 'review' AND token IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM crosspost_articles a JOIN crosspost_publications p ON p.article_id = a.id
          WHERE a.source_provider = ?1 AND a.source_content_id = ?2
          AND (p.status IN ('syncing', 'missing_remote') OR p.error_code = 'OUTCOME_UNKNOWN')
        ) RETURNING content_id`,
        )
        .bind(provider, contentId, now().toISOString())
        .first();
      return row !== null;
    },
    async enqueue(provider: string, contentId: string): Promise<void> {
      identifier.parse(provider);
      identifier.parse(contentId);
      const time = now().toISOString();
      await db
        .prepare(
          `INSERT INTO crosspost_jobs
        (provider, content_id, status, available_at, updated_at) VALUES (?, ?, 'pending', ?, ?)
        ON CONFLICT(provider, content_id) DO UPDATE SET
          generation = generation + 1,
          status = CASE WHEN status = 'running' THEN status ELSE 'pending' END,
          attempts = CASE WHEN status = 'running' THEN attempts ELSE 0 END,
          available_at = excluded.available_at, updated_at = excluded.updated_at,
          error_code = NULL
        RETURNING content_id`,
        )
        .bind(provider, contentId, time, time)
        .first();
    },
    async claim(provider: string): Promise<CrosspostJob | null> {
      identifier.parse(provider);
      const time = now().toISOString();
      // 選択と更新を1文にまとめ、並列ワーカーでも同じ記事を取得させない。
      return db
        .prepare(
          `UPDATE crosspost_jobs SET status = 'running', token = ?,
        attempts = attempts + 1, updated_at = ?
        WHERE provider = ? AND content_id = (
          SELECT content_id FROM crosspost_jobs
          WHERE provider = ? AND status = 'pending' AND available_at <= ?
          ORDER BY available_at, content_id LIMIT 1
        ) AND status = 'pending' RETURNING ${columns}`,
        )
        .bind(crypto.randomUUID(), time, provider, provider, time)
        .first<CrosspostJob>();
    },
    async finish(job: CrosspostJob, result: Completion): Promise<CrosspostJob> {
      if (!job.token) throw new Error("処理権がありません。");
      if (result.status === "pending" && !result.retryAt)
        throw new Error("再試行日時が必要です。");
      if (result.retryAt) z.iso.datetime().parse(result.retryAt);
      const time = now().toISOString();
      const saved = await db
        .prepare(
          `UPDATE crosspost_jobs SET
        status = CASE WHEN generation <> ? THEN 'pending' ELSE ? END,
        attempts = CASE WHEN generation <> ? THEN 0 ELSE attempts END,
        available_at = CASE WHEN generation <> ? THEN ? ELSE ? END,
        error_code = CASE WHEN generation <> ? THEN NULL ELSE ? END,
        token = NULL, updated_at = ?
        WHERE provider = ? AND content_id = ? AND status = 'running' AND token = ?
        RETURNING ${columns}`,
        )
        .bind(
          job.generation,
          result.status,
          job.generation,
          job.generation,
          time,
          result.retryAt ?? time,
          job.generation,
          result.errorCode ?? null,
          time,
          job.provider,
          job.contentId,
          job.token,
        )
        .first<CrosspostJob>();
      if (!saved) throw new Error("処理権が変更されています。");
      return saved;
    },
    async get(
      provider: string,
      contentId: string,
    ): Promise<CrosspostJob | null> {
      return db
        .prepare(
          `SELECT ${columns} FROM crosspost_jobs WHERE provider = ? AND content_id = ?`,
        )
        .bind(provider, contentId)
        .first<CrosspostJob>();
    },
  };
}
