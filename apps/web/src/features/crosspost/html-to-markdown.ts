import type { Element, Nodes } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toMdast } from "hast-util-to-mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";

export type ConversionIssue = {
  severity: "warning" | "error";
  message: string;
  line?: number;
};

export type ConversionResult =
  | {
      status: "converted" | "simplified";
      markdown: string;
      issues: ConversionIssue[];
    }
  | { status: "blocked"; markdown: null; issues: ConversionIssue[] };

const supportedTags = new Set([
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "del",
  "a",
  "img",
  "figure",
  "figcaption",
  "hr",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "span",
  "div",
  "u",
  "mark",
  "iframe",
]);

function textContent(node: Nodes): string {
  if (node.type === "text") return node.value;
  if (node.type === "element" && node.tagName === "br") return "\n";
  return "children" in node ? node.children.map(textContent).join("") : "";
}

function elements(node: Nodes): Element[] {
  return [
    ...(node.type === "element" ? [node] : []),
    ...("children" in node ? node.children.flatMap(elements) : []),
  ];
}

/** CMSに依存しない本文変換。通信・投稿・ファイル書き込みは行わない。 */
export function htmlToMarkdown(input: {
  html: string;
  sourceUrl: string;
}): ConversionResult {
  const issues: ConversionIssue[] = [];
  const issue = (
    node: Nodes,
    severity: ConversionIssue["severity"],
    message: string,
  ) => {
    issues.push({ severity, message, line: node.position?.start.line });
  };
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(input.sourceUrl);
    if (
      !/^https?:$/.test(sourceUrl.protocol) ||
      sourceUrl.username ||
      sourceUrl.password
    )
      throw new Error();
  } catch {
    return {
      status: "blocked",
      markdown: null,
      issues: [{ severity: "error", message: "元記事のURLが不正です。" }],
    };
  }

  const tree = fromHtml(input.html, {
    fragment: true,
    onerror(error) {
      issues.push({
        severity: "error",
        message: `HTMLの構文を確認してください: ${error.reason}`,
        line: error.line,
      });
    },
  });

  for (const node of elements(tree)) {
    const tag = node.tagName;
    const props = node.properties;
    if (!supportedTags.has(tag)) {
      issue(node, "error", `<${tag}> は未対応です。内容を確認してください。`);
      continue;
    }
    if (
      props.hidden ||
      /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(
        String(props.style ?? ""),
      )
    ) {
      issue(node, "error", "非表示の内容を含むため、自動変換を停止しました。");
    } else if (props.style || tag === "u" || tag === "mark") {
      issue(
        node,
        "warning",
        "文字色・下線などの装飾を省略し、内容を残します。",
      );
    }
    if (props.className && tag !== "code") {
      issue(node, "warning", "CSSクラスによる表示は引き継ぎません。");
    }
    // ライブラリによるCSSやhiddenの解釈で本文が消えないよう、判定後は除去する。
    delete props.style;
    delete props.hidden;
    if (tag === "u" || tag === "mark") node.tagName = "span";

    if (
      tag === "ol" &&
      (props.reversed ||
        elements(node).some(
          (item) =>
            item.tagName === "li" && item.properties.value !== undefined,
        ))
    ) {
      issue(node, "error", "逆順・個別の番号指定を含むリストは未対応です。");
    }
    if (tag === "table") {
      const nested = elements(node).slice(1);
      if (nested.some((item) => item.tagName === "table"))
        issue(node, "error", "入れ子の表は未対応です。");
      for (const cell of nested.filter(
        (item) => item.tagName === "td" || item.tagName === "th",
      )) {
        if (
          Number(cell.properties.colSpan ?? 1) !== 1 ||
          Number(cell.properties.rowSpan ?? 1) !== 1
        ) {
          issue(
            cell,
            "error",
            "セルを結合した表は、対応関係が失われるため変換できません。",
          );
        }
        if (
          elements(cell).some((item) =>
            ["br", "pre", "ul", "ol", "blockquote"].includes(item.tagName),
          ) ||
          cell.children.filter(
            (item) => item.type === "element" && item.tagName === "p",
          ).length > 1
        ) {
          issue(
            cell,
            "error",
            "セル内に改行・複数段落・ブロック要素がある表は未対応です。",
          );
        }
      }
    }

    if (tag === "pre") {
      const code = node.children.find(
        (child) => child.type === "element" && child.tagName === "code",
      );
      const classes =
        code?.type === "element" ? code.properties.className : undefined;
      const language = Array.isArray(classes)
        ? classes.find((name) => String(name).startsWith("language-"))
        : undefined;
      if (language && !/^language-[a-zA-Z0-9_+#.-]+$/.test(String(language))) {
        issue(node, "error", "コードの言語指定を確認してください。");
      }
      if (
        elements(node).some(
          (item) => !["pre", "code", "span", "br"].includes(item.tagName),
        )
      ) {
        issue(node, "error", "コードブロック内に文字以外の要素があります。");
      }
    }

    if (tag === "a" || tag === "img" || tag === "iframe") {
      const property = tag === "a" ? "href" : "src";
      const raw = props[property];
      if (tag === "a" && raw === undefined) continue;
      try {
        if (typeof raw !== "string" || !raw.trim()) throw new Error();
        const url = new URL(raw, sourceUrl);
        const protocols =
          tag === "a" ? ["https:", "http:", "mailto:"] : ["https:", "http:"];
        if (!protocols.includes(url.protocol) || url.username || url.password)
          throw new Error();
        props[property] = url.href;
        if (raw.startsWith("#"))
          issue(
            node,
            "warning",
            "ページ内リンクは元記事へのリンクとして残します。",
          );
      } catch {
        issue(node, "error", `<${tag}> のURLが不正または未対応です。`);
      }
      if (tag === "img" && (props.width || props.height || props.srcSet)) {
        issue(
          node,
          "warning",
          "画像は元のsrcと説明文を使い、サイズ・切り替え指定を省略します。",
        );
      }
      if (tag === "iframe") {
        if (props.srcDoc)
          issue(node, "error", "HTMLを直接埋め込むiframeは未対応です。");
        issue(node, "warning", "埋め込みを参照先へのリンクに置き換えます。");
        node.tagName = "p";
        node.children = [
          {
            type: "element",
            tagName: "a",
            properties: { href: props.src },
            children: [
              {
                type: "text",
                value: String(props.title || "埋め込みコンテンツ"),
              },
            ],
          },
        ];
        node.properties = {};
      }
    }
    if (tag === "figcaption") {
      node.tagName = "p";
      issue(node, "warning", "画像のキャプションは通常の段落として残します。");
    }
  }

  if (issues.some((item) => item.severity === "error"))
    return { status: "blocked", markdown: null, issues };

  const markdownTree = toMdast(tree, {
    // デフォルト変換によるコード末尾の空行削除を避ける。
    handlers: {
      pre(_state, node) {
        const code = node.children.find(
          (child) => child.type === "element" && child.tagName === "code",
        );
        const classes =
          code?.type === "element" ? code.properties.className : undefined;
        const language = Array.isArray(classes)
          ? classes
              .map(String)
              .find((name) => name.startsWith("language-"))
              ?.slice(9)
          : undefined;
        return {
          type: "code",
          lang: language ?? null,
          value: textContent(node),
        };
      },
    },
  });
  if (markdownTree.type !== "root") {
    return {
      status: "blocked",
      markdown: null,
      issues: [
        {
          severity: "error",
          message: "本文全体をMarkdownに変換できませんでした。",
        },
      ],
    };
  }
  markdownTree.children.push(
    { type: "thematicBreak" },
    {
      type: "paragraph",
      children: [
        {
          type: "link",
          url: sourceUrl.href,
          children: [{ type: "text", value: "元記事はこちら" }],
        },
      ],
    },
  );
  const markdown = toMarkdown(markdownTree, {
    extensions: [gfmToMarkdown()],
    bullet: "-",
    fences: true,
    // Zenn/Qiita固有のディレクティブを原文の文字列として保つ。
    unsafe: [
      { character: ":", atBreak: true, after: ":" },
      { character: "$" },
      { character: "@", after: "\\[" },
    ],
  });
  return {
    status: issues.length ? "simplified" : "converted",
    markdown,
    issues,
  };
}
