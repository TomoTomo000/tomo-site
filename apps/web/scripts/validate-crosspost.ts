import type { Nodes as HtmlNode } from "hast";
import type { Nodes as MarkdownNode } from "mdast";
import { fromHtml } from "hast-util-from-html";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";

type Node = HtmlNode | MarkdownNode;

function walk(node: Node): Node[] {
  return [node, ...("children" in node ? node.children.flatMap(walk) : [])];
}

function text(node: Node): string {
  if (node.type === "element" && node.tagName === "iframe")
    return String(node.properties.title || "埋め込みコンテンツ");
  if (["text", "code", "inlineCode"].includes(node.type) && "value" in node)
    return String(node.value);
  if (node.type === "element" && node.tagName === "br") return "\n";
  return "children" in node ? node.children.map(text).join("") : "";
}

/** 原文と、出力Markdownを再解析した結果を比較するローカル検証。 */
export function validateCrosspost(
  html: string,
  markdown: string,
  sourceUrl?: string,
) {
  const original = fromHtml(html, { fragment: true });
  const restored = fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  // 変換側で末尾に付けた区切り線と元記事リンクは比較対象外。
  const footer = restored.children.at(-1);
  const footerLink =
    footer?.type === "paragraph" ? footer.children[0] : undefined;
  const footerValid =
    restored.children.at(-2)?.type === "thematicBreak" &&
    footerLink?.type === "link" &&
    text(footerLink) === "元記事はこちら" &&
    (!sourceUrl || footerLink.url === new URL(sourceUrl).href);
  if (footerValid) restored.children.splice(-2);
  const before = walk(original);
  const after = walk(restored);
  const compact = (value: string) => value.replace(/\s+/g, "");
  const codeBefore = before
    .filter((node) => node.type === "element" && node.tagName === "pre")
    .map(text);
  const codeAfter = after.filter((node) => node.type === "code").map(text);
  const cellsBefore = before
    .filter(
      (node) => node.type === "element" && ["th", "td"].includes(node.tagName),
    )
    .map((node) => compact(text(node)));
  const cellsAfter = after
    .filter((node) => node.type === "tableCell")
    .map((node) => compact(text(node)));
  const same = (a: string[], b: string[]) =>
    JSON.stringify(a) === JSON.stringify(b);
  // Markdown側でURL文字列が自動リンクになることは許容する。
  const keepsLinks = (expected: string[], actual: string[]) => {
    let index = 0;
    for (const href of expected) {
      index = actual.indexOf(href, index);
      if (index === -1) return false;
      index++;
    }
    return true;
  };
  const url = (value: unknown) => {
    try {
      return new URL(String(value), sourceUrl).href;
    } catch {
      return String(value);
    }
  };
  const checks = {
    footer: footerValid,
    text: compact(text(original)) === compact(text(restored)),
    code: same(codeBefore, codeAfter),
    tableCells: same(cellsBefore, cellsAfter),
    headings: same(
      before
        .filter(
          (node) => node.type === "element" && /^h[1-6]$/.test(node.tagName),
        )
        .map((node) => compact(text(node))),
      after
        .filter((node) => node.type === "heading")
        .map((node) => compact(text(node))),
    ),
    images: same(
      before
        .filter((node) => node.type === "element" && node.tagName === "img")
        .map((node) =>
          node.type === "element"
            ? JSON.stringify([
                url(node.properties.src),
                node.properties.alt || "",
              ])
            : "",
        ),
      after
        .filter((node) => node.type === "image")
        .map((node) =>
          node.type === "image"
            ? JSON.stringify([node.url, node.alt || ""])
            : "",
        ),
    ),
    links: keepsLinks(
      before
        .filter(
          (node) =>
            node.type === "element" &&
            ((node.tagName === "a" && node.properties.href !== undefined) ||
              node.tagName === "iframe"),
        )
        .map((node) =>
          node.type === "element"
            ? url(node.properties[node.tagName === "a" ? "href" : "src"])
            : "",
        ),
      after
        .filter((node) => node.type === "link")
        .map((node) => (node.type === "link" ? node.url : "")),
    ),
  };
  return {
    passed: Object.values(checks).every(Boolean),
    checks,
    codeBlocks: codeBefore.length,
    tableCells: cellsBefore.length,
  };
}
