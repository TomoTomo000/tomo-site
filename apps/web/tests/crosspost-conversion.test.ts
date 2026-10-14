import { describe, expect, test } from "bun:test";
import { fromMarkdown } from "mdast-util-from-markdown";
import { htmlToMarkdown } from "../src/features/crosspost/html-to-markdown";
import { validateCrosspost } from "../scripts/validate-crosspost";

const sourceUrl = "https://example.com/blog/article";
const convert = (html: string) => htmlToMarkdown({ html, sourceUrl });

describe("クロスポスト用の本文変換", () => {
  test("見出し・入れ子リスト・引用・文字装飾を保持する", () => {
    const html =
      "<h2>React &amp; TypeScript</h2><p><strong>重要</strong>と<em>強調</em>、<del>削除</del></p><ul><li>親<ul><li>子</li></ul></li></ul><blockquote><p>引用</p></blockquote>";
    const result = convert(html);
    expect(result.status).toBe("converted");
    expect(result.markdown).toContain("## React & TypeScript");
    expect(result.markdown).toContain("~~削除~~");
    expect(validateCrosspost(html, result.markdown!).passed).toBe(true);
  });

  test("コードの文字実体参照・インデント・末尾空行・バッククォートを保持する", () => {
    const html =
      '<pre><code class="language-html">&lt;div&gt;\n  &amp;amp; ```\n&lt;/div&gt;\n\n</code></pre>';
    const result = convert(html);
    expect(result.status).toBe("converted");
    const code = fromMarkdown(result.markdown!).children.find(
      (node) => node.type === "code",
    );
    expect(code).toMatchObject({
      lang: "html",
      value: "<div>\n  &amp; ```\n</div>\n\n",
    });
    expect(validateCrosspost(html, result.markdown!).passed).toBe(true);
  });

  test("言語未指定のコードを推測せず、表内のコード・縦棒も保持する", () => {
    const html =
      "<pre><code>const a = 1;</code></pre><table><tbody><tr><th><p>項目</p></th><th><p>値</p></th></tr><tr><td><p><code>a|b</code></p></td><td><p>A &amp; B</p></td></tr></tbody></table>";
    const result = convert(html);
    expect(result.status).toBe("converted");
    expect(fromMarkdown(result.markdown!).children[0]).toMatchObject({
      type: "code",
      lang: null,
    });
    expect(validateCrosspost(html, result.markdown!).passed).toBe(true);
  });

  test("相対URLと画像の説明を保持し、元記事リンクを末尾に付ける", () => {
    const result = convert(
      '<p><a href="/about">紹介</a></p><img src="/photo.png" alt="人物のイラスト">',
    );
    expect(result.status).toBe("converted");
    expect(result.markdown).toContain("[紹介](https://example.com/about)");
    expect(result.markdown).toContain(
      "![人物のイラスト](https://example.com/photo.png)",
    );
    expect(
      result.markdown?.trimEnd().endsWith(`[元記事はこちら](${sourceUrl})`),
    ).toBe(true);
  });

  test("画像サイズ・装飾・キャプションの簡略化を報告する", () => {
    const result = convert(
      '<p><span style="color:red">注意</span></p><figure><img src="/photo.png" width="300" alt="説明"><figcaption>図の説明</figcaption></figure>',
    );
    expect(result.status).toBe("simplified");
    expect(result.issues).toHaveLength(3);
    expect(result.markdown).toContain("注意");
    expect(result.markdown).toContain("図の説明");
  });

  test("埋め込みは参照先のリンクに置き換えて報告する", () => {
    const result = convert(
      '<iframe src="https://example.org/video" title="解説動画"></iframe>',
    );
    expect(result.status).toBe("simplified");
    expect(result.markdown).toContain("[解説動画](https://example.org/video)");
    expect(
      validateCrosspost(
        '<iframe src="https://example.org/video" title="解説動画"></iframe>',
        result.markdown!,
        sourceUrl,
      ).passed,
    ).toBe(true);
  });

  test("検証処理は画像・リンク先・元記事リンクの欠落も検知する", () => {
    const html =
      '<p><a href="/about">紹介</a></p><img src="/photo.png" alt="説明">';
    const result = convert(html);
    expect(validateCrosspost(html, result.markdown!, sourceUrl).passed).toBe(
      true,
    );
    expect(
      validateCrosspost(
        html,
        result.markdown!.replace("/photo.png", "/wrong.png"),
        sourceUrl,
      ).checks.images,
    ).toBe(false);
    expect(
      validateCrosspost(
        html,
        result.markdown!.replace("/about", "/wrong"),
        sourceUrl,
      ).checks.links,
    ).toBe(false);
    expect(
      validateCrosspost(
        html,
        result.markdown!.replace("元記事はこちら", "別のリンク"),
        sourceUrl,
      ).checks.footer,
    ).toBe(false);
  });

  test.each([
    '<table><tr><td colspan="2">結合</td></tr></table>',
    "<table><tr><td><p>段落1</p><p>段落2</p></td></tr></table>",
    '<p><img src="javascript:alert(1)"></p>',
    '<p><a href="javascript:alert(1)">リンク</a></p>',
    '<iframe srcdoc="本文"></iframe>',
    '<video src="/video.mp4"></video>',
    "<script>alert(1)</script>",
    "<p hidden>非表示</p>",
    '<p style="display:none">非表示</p>',
    "<ol reversed><li>逆順</li></ol>",
    "<custom-element>未対応</custom-element>",
  ])("内容を安全に保てないHTMLはMarkdownを返さない: %s", (html) => {
    const result = convert(html);
    expect(result.status).toBe("blocked");
    expect(result.markdown).toBeNull();
    expect(result.issues.some((issue) => issue.severity === "error")).toBe(
      true,
    );
  });

  test("Markdownや媒体固有の構文が本文として残る", () => {
    const html =
      "<p>:::message</p><p>$$formula$$</p><p>@[card](https://example.com)</p><p># 見出しではない</p>";
    const result = convert(html);
    expect(validateCrosspost(html, result.markdown!).passed).toBe(true);
    expect(result.markdown).toContain("\\:");
    expect(result.markdown).toContain("\\$");
    expect(result.markdown).toContain("@\\[");
  });

  test("検証処理が本文・コード・表の欠落を検知する", () => {
    const html = "<h2>見出し</h2><p>本文</p><pre><code>  code</code></pre>";
    const result = convert(html);
    expect(
      validateCrosspost(html, result.markdown!.replace("本文", "")).passed,
    ).toBe(false);
    expect(
      validateCrosspost(html, result.markdown!.replace("  code", "code")).checks
        .code,
    ).toBe(false);
  });
});
