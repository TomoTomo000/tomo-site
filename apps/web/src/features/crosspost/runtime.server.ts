import { jobStore } from "./job-store";
import { microCmsWebhook } from "./microcms-webhook";
import { microCmsSource, microCmsContentId } from "./microcms-source";
import { processJob } from "./process-job";
import { publicationStore, type CrosspostDatabase } from "./publication-store";
import { qiitaPublisher } from "./publishers/qiita";
import { zennPublisher } from "./publishers/zenn";
import {
  PublishError,
  type HttpClient,
  type Publisher,
} from "./publishers/publisher";
import { SyncError } from "./sync-error";

export type CrosspostEnv = {
  APP_ENV?: string;
  CROSSPOST_ENABLED?: string;
  CROSSPOST_DB?: CrosspostDatabase;
  CROSSPOST_QUEUE?: { send(body: { contentId: string }): Promise<void> };
  MICROCMS_SERVICE_DOMAIN?: string;
  MICROCMS_API_KEY?: string;
  CROSSPOST_WEBHOOK_SECRET?: string;
  SITE_URL?: string;
  QIITA_TOKEN?: string;
  ZENN_GITHUB_TOKEN?: string;
  ZENN_GITHUB_OWNER?: string;
  ZENN_GITHUB_REPOSITORY?: string;
  ZENN_GITHUB_BRANCH?: string;
  ZENN_USERNAME?: string;
};
const enabled = (env: CrosspostEnv) =>
  env.APP_ENV === "production" && env.CROSSPOST_ENABLED === "true";
function configuredPublisher(factory: () => Publisher): Publisher {
  return async (input) => {
    let publisher: Publisher;
    try {
      publisher = factory();
    } catch {
      throw new PublishError(
        "CONFIGURATION",
        "投稿先の設定を確認してください。",
        "blocked",
      );
    }
    return publisher(input);
  };
}
function required(value: string | undefined): string {
  if (!value?.trim()) throw new Error("クロスポストの設定が不足しています。");
  return value;
}
export async function receiveCrosspost(
  request: Request,
  env: CrosspostEnv,
): Promise<Response> {
  if (!enabled(env)) return new Response(null, { status: 404 });
  try {
    if (!env.CROSSPOST_DB) throw new Error("DB未設定");
    const jobs = jobStore(env.CROSSPOST_DB);
    return await microCmsWebhook(
      {
        service: required(env.MICROCMS_SERVICE_DOMAIN),
        secret: required(env.CROSSPOST_WEBHOOK_SECRET),
      },
      async (id) => {
        await jobs.enqueue("microcms", id);
        try {
          if (!env.CROSSPOST_QUEUE) throw new Error("Queue未設定");
          await env.CROSSPOST_QUEUE.send({ contentId: id });
        } catch {
          // 保存済みなので受理する。Queue障害時はCronが処理を引き継ぐ。
          console.error(
            "Crosspost queue unavailable; saved job will be processed by cron.",
          );
        }
      },
    )(request);
  } catch {
    return Response.json(
      { result: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
/** Queueは通知された記事、Cronは実行可能な最古のジョブを処理する。 */
async function runCrosspost(
  env: CrosspostEnv,
  http: HttpClient,
  contentId?: string,
): Promise<void> {
  if (!enabled(env)) return;
  // DB接続の失敗は呼び出し元へ返す。記事取得・投稿先の失敗はジョブ側で記録する。
  try {
    if (!env.CROSSPOST_DB) throw new Error("DB未設定");
    const source = async (id: string) => {
      let read: ReturnType<typeof microCmsSource>;
      try {
        read = microCmsSource(
          {
            service: required(env.MICROCMS_SERVICE_DOMAIN),
            apiKey: required(env.MICROCMS_API_KEY),
            siteUrl: required(env.SITE_URL),
          },
          http,
        );
      } catch {
        throw new SyncError("SOURCE_CONFIGURATION", false);
      }
      return read(id);
    };
    const publishers = {
      qiita: configuredPublisher(() =>
        qiitaPublisher({ token: required(env.QIITA_TOKEN) }, http),
      ),
      zenn: configuredPublisher(() =>
        zennPublisher(
          {
            token: required(env.ZENN_GITHUB_TOKEN),
            owner: required(env.ZENN_GITHUB_OWNER),
            repository: required(env.ZENN_GITHUB_REPOSITORY),
            branch: required(env.ZENN_GITHUB_BRANCH),
            username: required(env.ZENN_USERNAME),
          },
          http,
        ),
      ),
    };
    await processJob(
      "microcms",
      jobStore(env.CROSSPOST_DB),
      source,
      publicationStore(env.CROSSPOST_DB),
      publishers,
      { contentId },
    );
  } catch {
    throw new Error(
      "クロスポストの処理に失敗しました。設定とDBを確認してください。",
    );
  }
}

export async function scheduledCrosspost(
  env: CrosspostEnv,
  http: HttpClient,
): Promise<void> {
  await runCrosspost(env, http);
}

/** 重複配信でもDBの処理権を取得できた場合だけ投稿する。 */
export async function queuedCrosspost(
  batch: MessageBatch<unknown>,
  env: CrosspostEnv,
  http: HttpClient,
): Promise<void> {
  for (const message of batch.messages) {
    if (!enabled(env)) {
      message.ack();
      continue;
    }
    const body = message.body;
    const id = microCmsContentId.safeParse(
      body && typeof body === "object" && "contentId" in body
        ? body.contentId
        : undefined,
    );
    if (!id.success) {
      console.error("Invalid crosspost queue message.");
      message.ack();
      continue;
    }
    try {
      await runCrosspost(env, http, id.data);
      const job = await jobStore(env.CROSSPOST_DB!).get("microcms", id.data);
      // 実行中の更新通知も、元の処理完了後に取り直す。ロックは解除しない。
      if (job?.status === "running" || job?.status === "pending") {
        const delaySeconds =
          job.status === "running"
            ? 5
            : Math.min(
                43200,
                Math.max(
                  0,
                  Math.ceil((Date.parse(job.availableAt) - Date.now()) / 1000),
                ),
              );
        message.retry({ delaySeconds });
      } else {
        message.ack();
      }
    } catch {
      console.error("Crosspost queue processing failed; retry scheduled.");
      message.retry({ delaySeconds: 60 });
    }
  }
}
