import { parseArgs, parseEnv } from "node:util";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import { jobStore } from "../src/features/crosspost/job-store";
import { microCmsContentId } from "../src/features/crosspost/microcms-source";
import {
  publicationStore,
  type CrosspostDatabase,
} from "../src/features/crosspost/publication-store";
import { stopZenn } from "../src/features/crosspost/stop-zenn";
import { zennFileRemoval } from "../src/features/crosspost/publishers/zenn";

// DBはWrangler認証。掲載終了時だけGitHubのトークンを読み込む。
const cwd = fileURLToPath(new URL("../", import.meta.url));
async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      remote: { type: "boolean" },
      local: { type: "boolean" },
      id: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      "crosspost:status --remote|--local [--id 記事ID]\ncrosspost:retry --remote|--local --id 記事ID\ncrosspost:stop-zenn --remote --id 記事ID\n掲載終了は同期停止を記録してGitHubの記事ファイルを削除します。最後にZenn画面で削除してください。\n再実行は確認待ちのみ。処理中・投稿結果不明・削除済みは手動調査が必要です。",
    );
    return;
  }
  const command = positionals[0];
  if (
    positionals.length !== 1 ||
    !["status", "retry", "stop-zenn"].includes(command) ||
    !!values.remote === !!values.local
  )
    throw new Error(
      "status/retry/stop-zennと --remote または --local を指定してください。--helpで使い方を確認できます。",
    );
  const id =
    values.id === undefined ? undefined : microCmsContentId.parse(values.id);
  if (command === "retry" && !id)
    throw new Error("再実行には --id が必要です。");
  if (command === "stop-zenn" && (!id || !values.remote))
    throw new Error(
      "掲載終了には --remote と --id が必要です。ローカルDBの操作で外部記事は削除できません。",
    );
  async function query(sql: string): Promise<Record<string, unknown>[]> {
    const child = Bun.spawn(
      [
        "bunx",
        "--no-install",
        "wrangler",
        "d1",
        "execute",
        "CROSSPOST_DB",
        values.remote ? "--remote" : "--local",
        "--config",
        "wrangler.jsonc",
        "--command",
        // Windowsのbunx経由でも改行で引数が分割されないようにする。
        sql.replace(/\s+/g, " "),
        "--json",
      ],
      { cwd, stdout: "pipe", stderr: "pipe" },
    );
    const [stdout] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    if ((await child.exited) !== 0)
      throw new Error(
        "D1の処理に失敗しました。Cloudflareの認証・権限とDBのマイグレーション適用状況を確認してください。",
      );
    const result = JSON.parse(stdout);
    if (
      !Array.isArray(result) ||
      !result.every((item) => item.success && Array.isArray(item.results))
    )
      throw new Error("D1の応答を確認できませんでした。");
    return result.flatMap((item) => item.results);
  }
  const literal = (value: string | number | null) =>
    value === null
      ? "NULL"
      : typeof value === "number"
        ? String(value)
        : "'" + value.replaceAll("'", "''") + "'";
  const db: CrosspostDatabase = {
    prepare(sql) {
      let parameters: (string | number | null)[] = [];
      const execute = () =>
        query(
          sql.replace(/\?(\d+)/g, (_, index) => {
            const value = parameters[Number(index) - 1];
            if (value === undefined)
              throw new Error("SQLパラメーターが不足しています。");
            return literal(value);
          }),
        );
      return {
        bind(...values) {
          parameters = values;
          return this;
        },
        async first<T>() {
          return ((await execute())[0] ?? null) as T | null;
        },
        async all<T>() {
          return { results: (await execute()) as T[] };
        },
      };
    },
  };
  if (command === "stop-zenn") {
    const parsed = ts.parseConfigFileTextToJson(
      "wrangler.jsonc",
      await readFile(join(cwd, "wrangler.jsonc"), "utf8"),
    );
    if (parsed.error)
      throw new Error("wrangler.jsoncの設定を読み取れませんでした。");
    const vars = parsed.config?.vars ?? {};
    let token: string | undefined = process.env.ZENN_GITHUB_TOKEN;
    if (!token) {
      try {
        token = parseEnv(
          await readFile(join(cwd, ".dev.vars"), "utf8"),
        ).ZENN_GITHUB_TOKEN;
      } catch {
        throw new Error(
          "ZENN_GITHUB_TOKENを環境変数またはapps/web/.dev.varsに設定してください。",
        );
      }
    }
    const removeFile = zennFileRemoval(
      {
        token: token ?? "",
        owner: vars.ZENN_GITHUB_OWNER,
        repository: vars.ZENN_GITHUB_REPOSITORY,
        branch: vars.ZENN_GITHUB_BRANCH,
        username: vars.ZENN_USERNAME,
      },
      fetch,
    );
    await stopZenn(
      { provider: "microcms", contentId: id! },
      publicationStore(db),
      removeFile,
    );
    console.log(
      "Zenn同期の停止とGitHubの記事ファイル削除を確認しました。Zenn側のデプロイ完了後、Zennの画面で記事を削除してください。同期チェックがオンでも再投稿しません。",
    );
  }
  if (command === "retry") {
    if (!(await jobStore(db).retry("microcms", id!)))
      throw new Error(
        "再実行しませんでした。対象が確認待ちではないか、投稿結果・削除状態の確認が必要です。statusで確認してください。",
      );
    console.log(
      "再受付しました。既存の記事IDを維持し、次の定期処理で最新の公開内容を同期します。",
    );
  }
  const filter = id ? ` AND j.content_id = ${literal(id)}` : "";
  const rows =
    await query(`SELECT j.content_id, j.status AS job_status, j.attempts, j.error_code AS job_error,
    j.available_at, p.target, p.status AS publication_status, p.remote_url,
    p.error_code AS publication_error, p.error_message, p.next_retry_at
    FROM crosspost_jobs j LEFT JOIN crosspost_articles a ON a.source_provider = j.provider AND a.source_content_id = j.content_id
    LEFT JOIN crosspost_publications p ON p.article_id = a.id
    WHERE j.provider = 'microcms'${filter} ORDER BY j.updated_at DESC, p.target LIMIT 100`);
  const reasons: Record<string, string> = {
    SOURCE_CONFIGURATION: "CMS取得設定が不足・不正です。",
    SOURCE_NETWORK: "CMSへの通信に失敗しました。",
    SOURCE_READ: "記事取得処理に失敗しました。",
    SOURCE_INVALID_DATA: "公開記事の形式が不正です。",
    STORAGE: "DB保存に失敗、または更新が競合しました。",
    CONVERSION: "Markdown変換に失敗しました。",
    PUBLISH_RETRY: "投稿先への送信を再試行待ちです。",
    PUBLICATION_REVIEW: "投稿先ごとのエラーを確認してください。",
    SOURCE_OR_STORAGE: "旧形式の記録：記事取得またはDB保存の失敗です。",
  };
  console.log(
    JSON.stringify(
      rows.map((row) => ({
        ...row,
        job_reason:
          typeof row.job_error === "string"
            ? (reasons[row.job_error] ??
              (row.job_error.startsWith("SOURCE_HTTP_")
                ? `CMSのHTTPエラー（${row.job_error.slice(12)}）。認証・権限・サービス状態を確認してください。`
                : row.job_error))
            : null,
      })),
      null,
      2,
    ),
  );
  console.log(
    "最大100行表示。submittedはGitHub送信済み、pausedは掲載終了による同期停止です。GitHub削除に失敗した場合もpausedを維持するため、同じ掲載終了コマンドを再実行してください。",
  );
}
main().catch((error: unknown) => {
  console.error(
    error instanceof Error && error.name !== "ZodError"
      ? error.message
      : "引数が不正です。",
  );
  process.exitCode = 1;
});
