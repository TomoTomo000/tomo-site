import type { jobStore } from "./job-store";
import { syncSourceArticle } from "./sync-source-article";
import { SyncError } from "./sync-error";

/** 1回につき1記事。永続化済み通知を、同じ関数で初回処理・再処理する。 */
export async function processJob(
  provider: string,
  jobs: ReturnType<typeof jobStore>,
  source: Parameters<typeof syncSourceArticle>[1],
  publications: Parameters<typeof syncSourceArticle>[2],
  publishers: Parameters<typeof syncSourceArticle>[3],
  options: {
    now?: () => Date;
    sleep?: (milliseconds: number) => Promise<void>;
    contentId?: string;
  } = {},
) {
  const job = await jobs.claim(provider, options.contentId);
  if (!job) return null;
  const now = options.now ?? (() => new Date());
  let retryAt: string | undefined;
  let errorCode: string | undefined;
  let review: boolean;
  try {
    const results = await syncSourceArticle(
      job.contentId,
      async (id) => {
        try {
          return await source(id);
        } catch (error) {
          throw error instanceof SyncError
            ? error
            : new SyncError("SOURCE_READ");
        }
      },
      publications,
      publishers,
      options,
    );
    const retries = results.filter(
      ({ publication }) => publication?.status === "failed",
    );
    review = results.some(
      (result) =>
        result.action === "needs_review" &&
        result.publication?.status !== "failed",
    );
    errorCode = results.find((result) => result.errorCode)?.errorCode;
    if (retries.length) {
      const fallback = now().getTime() + 60_000;
      retryAt = new Date(
        Math.max(
          fallback,
          ...retries.map(({ publication }) =>
            publication?.nextRetryAt
              ? Date.parse(publication.nextRetryAt)
              : fallback,
          ),
        ),
      ).toISOString();
      errorCode = "PUBLISH_RETRY";
    }
  } catch (error) {
    errorCode = error instanceof SyncError ? error.code : "STORAGE";
    review = error instanceof SyncError && !error.retryable;
    if (!review)
      retryAt = new Date(
        now().getTime() + Math.min(3600, 60 * 2 ** (job.attempts - 1)) * 1000,
      ).toISOString();
  }
  // 確認が必要な媒体があっても、もう片方の再試行は続ける。
  const status =
    retryAt && job.attempts < 5
      ? "pending"
      : review || retryAt
        ? "review"
        : "done";
  // 保存失敗やプロセス中断ではrunningのまま残す。外部送信済みか不明なため
  // 時間経過だけでロックを解除せず、手動確認する。
  const saved = await jobs.finish(job, {
    status,
    retryAt: status === "pending" ? retryAt : undefined,
    errorCode:
      status === "done" ? undefined : (errorCode ?? "PUBLICATION_REVIEW"),
  });
  return { contentId: job.contentId, status: saved.status };
}
