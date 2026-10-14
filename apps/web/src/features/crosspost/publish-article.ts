import type { CrosspostArticle } from "./article";
import { htmlToMarkdown } from "./html-to-markdown";
import { SyncError } from "./sync-error";
import type {
  Publication,
  PublicationTarget,
  publicationStore,
} from "./publication-store";
import {
  PublishError,
  type Publisher,
  type PublishInput,
} from "./publishers/publisher";

type Store = ReturnType<typeof publicationStore>;
export type SyncResult = {
  target: PublicationTarget;
  action: "skipped" | "updated" | "needs_review";
  publication?: Publication;
  reason?: string;
  errorCode?: string;
};

async function contentHash(
  input: PublishInput,
  target: PublicationTarget,
): Promise<string> {
  const content = JSON.stringify([
    "crosspost-v1",
    input.title,
    input.markdown,
    input.tags,
    ...(target === "zenn" ? [input.emoji, input.zennType] : []),
  ]);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** 呼び出し元は最新の公開記事を渡す。 */
export async function publishArticle(
  article: CrosspostArticle,
  store: Store,
  publishers: Partial<Record<PublicationTarget, Publisher>>,
  options: { sleep?: (milliseconds: number) => Promise<void> } = {},
): Promise<SyncResult[]> {
  const targets: PublicationTarget[] = ["zenn", "qiita"];
  if (!article.publishedAt)
    return targets.map((target) => ({
      target,
      action: "skipped",
      reason: "未公開の記事です。",
    }));
  const enabled = (target: PublicationTarget) =>
    target === "zenn" ? article.settings.syncZenn : article.settings.syncQiita;
  if (!targets.some(enabled))
    return targets.map((target) => ({
      target,
      action: "skipped",
      reason: "同期がオフです。",
    }));
  const stored = await store.ensureArticle({
    source: article.source,
    sourceUrl: article.sourceUrl,
  });
  let conversion: ReturnType<typeof htmlToMarkdown>;
  try {
    conversion = htmlToMarkdown({
      html: article.bodyHtml,
      sourceUrl: article.sourceUrl,
    });
  } catch {
    throw new SyncError("CONVERSION", false);
  }
  const warnings = [
    ...new Set(
      conversion.issues
        .filter((issue) => issue.severity === "warning")
        .map((issue) => issue.message),
    ),
  ];
  const sleep =
    options.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const results: SyncResult[] = [];

  for (const target of targets) {
    if (!enabled(target)) {
      results.push({ target, action: "skipped", reason: "同期がオフです。" });
      continue;
    }
    try {
      const current = await store.ensurePublication(stored.id, target);
      if (current.status === "paused") {
        results.push({
          target,
          action: "skipped",
          publication: current,
          reason: "掲載終了済みです。同期チェックに関係なく再投稿しません。",
        });
        continue;
      }
      if (
        current.status === "syncing" ||
        current.status === "missing_remote" ||
        current.errorCode === "OUTCOME_UNKNOWN"
      ) {
        results.push({
          target,
          action: "needs_review",
          publication: current,
          reason: "処理中または投稿先の確認待ちです。自動再投稿は行いません。",
        });
        continue;
      }
      const publisher = publishers[target];
      if (current.nextRetryAt && Date.parse(current.nextRetryAt) > Date.now()) {
        results.push({
          target,
          action: "skipped",
          publication: current,
          reason: "再試行の待ち時間中です。",
        });
        continue;
      }
      if (conversion.markdown === null || !publisher) {
        const publication = await store.savePublication({
          articleId: stored.id,
          target,
          expectedRevision: current.revision,
          status: "blocked",
          warnings,
          error:
            conversion.markdown === null
              ? {
                  code: "CONVERSION",
                  message:
                    "本文の変換で内容を保持できません。ローカル検証結果を確認してください。",
                }
              : { code: "CONFIGURATION", message: "投稿先が未設定です。" },
        });
        results.push({ target, action: "needs_review", publication });
        continue;
      }
      const input: PublishInput = {
        articleId: stored.id,
        remoteId: current.remoteId,
        title: article.title,
        markdown: conversion.markdown,
        tags: article.tags,
        emoji: article.settings.emoji,
        zennType: article.settings.zennType,
      };
      const hash = await contentHash(input, target);
      if (
        (["synced", "simplified"].includes(current.status) &&
          current.lastSyncedHash === hash) ||
        (current.status === "submitted" && current.lastAttemptHash === hash)
      ) {
        results.push({
          target,
          action: "skipped",
          publication: current,
          reason: "同じ内容を送信済みです。",
        });
        continue;
      }
      // 外部送信より先に更新権を取得する。競合した実行はここで止まる。
      const claimed = await store.savePublication({
        articleId: stored.id,
        target,
        expectedRevision: current.revision,
        status: "syncing",
        contentHash: hash,
        warnings,
      });
      let outcome: Awaited<ReturnType<Publisher>> | undefined;
      let failure: PublishError | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          outcome = await publisher(input);
          break;
        } catch (error) {
          failure =
            error instanceof PublishError
              ? error
              : new PublishError(
                  "OUTCOME_UNKNOWN",
                  "送信結果を確認できません。自動再投稿は停止しました。",
                  "unknown",
                );
          const delay = Math.max(
            1000,
            (failure.retryAfterSeconds ?? 2 ** attempt) * 1000,
          );
          // 長い待機はここで抱えず失敗として残し、次回の実行に委ねる。
          if (
            failure.disposition !== "retry" ||
            attempt === 2 ||
            delay > 30_000
          )
            break;
          await sleep(delay);
        }
      }
      // 送信後の保存が失敗した場合はsyncingを残す。次回に新規投稿を繰り返さない。
      const publication = outcome
        ? await store.savePublication({
            articleId: stored.id,
            target,
            expectedRevision: claimed.revision,
            status:
              outcome.status === "submitted"
                ? "submitted"
                : warnings.length
                  ? "simplified"
                  : "synced",
            remoteId: outcome.remoteId,
            remoteUrl: outcome.remoteUrl,
            contentHash: hash,
            warnings,
          })
        : await store.savePublication({
            articleId: stored.id,
            target,
            expectedRevision: claimed.revision,
            status:
              failure?.disposition === "retry"
                ? "failed"
                : failure?.disposition === "missing_remote"
                  ? "missing_remote"
                  : "blocked",
            warnings,
            error: {
              code: failure?.code ?? "OUTCOME_UNKNOWN",
              message: failure?.message ?? "送信結果の確認が必要です。",
            },
            nextRetryAt:
              failure?.disposition === "retry"
                ? new Date(
                    Date.now() +
                      Math.max(1, failure.retryAfterSeconds ?? 60) * 1000,
                  ).toISOString()
                : undefined,
          });
      results.push({
        target,
        action: outcome ? "updated" : "needs_review",
        publication,
      });
    } catch {
      results.push({
        target,
        action: "needs_review",
        errorCode: "STORAGE",
        reason:
          "同期状態の保存に失敗、または別の処理と競合しました。状態を確認してください。",
      });
    }
  }
  return results;
}
