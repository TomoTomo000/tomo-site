import { jobStore } from "./job-store";
import { microCmsWebhook } from "./microcms-webhook";
import { microCmsSource } from "./microcms-source";
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
      (id) => jobs.enqueue("microcms", id),
    )(request);
  } catch {
    return Response.json(
      { result: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
/** 定期実行1回につき1記事。遅延・未処理の通知は次の実行へ残す。 */
export async function scheduledCrosspost(
  env: CrosspostEnv,
  http: HttpClient,
): Promise<void> {
  if (!enabled(env)) return;
  // DB接続の失敗はCronエラー。記事取得・投稿先の失敗はジョブ側で記録する。
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
    );
  } catch {
    throw new Error(
      "クロスポストの定期処理に失敗しました。設定とDBを確認してください。",
    );
  }
}
