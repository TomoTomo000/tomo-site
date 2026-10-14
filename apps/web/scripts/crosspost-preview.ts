import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { htmlToMarkdown } from "../src/features/crosspost/html-to-markdown";
import { validateCrosspost } from "./validate-crosspost";
import {
  crosspostArticleFromMicroCms,
  microCmsCrosspostFields,
} from "../src/features/crosspost/microcms-article";

const articleSchema = z.object({
  id: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .max(100),
  title: z.string(),
  content: z.string(),
});

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      all: { type: "boolean" },
      file: { type: "string" },
      url: { type: "string" },
    },
    strict: true,
  });
  if (
    Boolean(values.all) === Boolean(values.file) ||
    (values.file && !values.url)
  ) {
    throw new Error(
      "--all（公開記事）または --file <HTMLファイル> --url <元記事URL> を指定してください。",
    );
  }

  const articles: Array<
    z.infer<typeof articleSchema> & {
      sourceUrl: string;
      settings?: ReturnType<typeof crosspostArticleFromMicroCms>["settings"];
    }
  > = [];
  if (values.file) {
    articles.push({
      id: "local",
      title: values.file,
      content: await readFile(values.file, "utf8"),
      sourceUrl: values.url!,
    });
  } else {
    const domain = process.env.MICROCMS_SERVICE_DOMAIN?.trim();
    const key = process.env.MICROCMS_API_KEY?.trim();
    if (!domain || !/^[a-z0-9-]+$/.test(domain) || !key)
      throw new Error("microCMSの環境変数が未設定です。");
    const site = new URL(process.env.SITE_URL || "https://tomo-site.page");
    for (let offset = 0; ; offset += 100) {
      const url = new URL(`https://${domain}.microcms.io/api/v1/blog`);
      url.search = new URLSearchParams({
        limit: "100",
        offset: String(offset),
        fields: microCmsCrosspostFields,
        depth: "1",
      }).toString();
      let response: Response;
      try {
        // 公開内容のみをGETする。下書き取得・投稿先への送信は行わない。
        response = await fetch(url, {
          headers: { "X-MICROCMS-API-KEY": key },
          signal: AbortSignal.timeout(15_000),
          redirect: "error",
        });
      } catch {
        throw new Error(
          "microCMSの公開記事を取得できませんでした。通信状況を確認してください。",
        );
      }
      if (!response.ok)
        throw new Error(
          `microCMSの取得に失敗しました（HTTP ${response.status}）。`,
        );
      const data = z
        .object({
          contents: z.array(z.unknown()),
          totalCount: z.number().int().nonnegative(),
        })
        .parse(await response.json());
      articles.push(
        ...data.contents.map((value) => {
          const article = crosspostArticleFromMicroCms(value, site.href);
          const identity = articleSchema.parse({
            id: article.source.contentId,
            title: article.title,
            content: article.bodyHtml,
          });
          return {
            ...identity,
            sourceUrl: article.sourceUrl,
            settings: article.settings,
          };
        }),
      );
      if (offset + data.contents.length >= data.totalCount) break;
      if (!data.contents.length)
        throw new Error("記事一覧のページ取得が途中で停止しました。");
    }
  }

  const parent = join(import.meta.dirname, "..", ".crosspost-preview");
  await mkdir(parent, { recursive: true });
  const output = await mkdtemp(join(parent, "run-"));
  const reports = [];
  for (const article of articles) {
    const result = htmlToMarkdown({
      html: article.content,
      sourceUrl: article.sourceUrl,
    });
    const validation =
      result.markdown === null
        ? null
        : validateCrosspost(
            article.content,
            result.markdown,
            article.sourceUrl,
          );
    const passed = validation?.passed === true;
    // 簡略化による差分も確認対象。検証に通らないものは公開用ファイルを作らない。
    if (passed && result.markdown !== null)
      await writeFile(join(output, `${article.id}.md`), result.markdown);
    reports.push({
      id: article.id,
      title: article.title,
      settings: article.settings,
      status: passed ? result.status : "blocked",
      issues: result.issues,
      validation,
    });
    console.log(
      `${passed ? "PASS" : "CHECK"} ${article.title}（${result.status}）`,
    );
  }
  await writeFile(
    join(output, "report.json"),
    JSON.stringify(reports, null, 2),
  );
  console.log(`検証結果: ${output}`);
  if (reports.some((report) => report.status === "blocked"))
    process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(
    error instanceof z.ZodError
      ? "microCMSの応答形式が想定と異なります。"
      : error instanceof Error
        ? error.message
        : "検証に失敗しました。",
  );
  process.exitCode = 1;
});
