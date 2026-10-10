import { describe, expect, test } from "bun:test";
import { sanitizeMicroCmsArticle } from "../src/features/blog/server/microcms-content.server";

describe("sanitizeMicroCmsArticle", () => {
  test("decodes heading entities into text without interpreting code as HTML", () => {
    const article = sanitizeMicroCmsArticle(
      "<h2>React &amp; TypeScript &#x1F600;</h2><h3><code>&lt;div&gt;</code>&nbsp;&quot;属性&quot; &#26085;&#26412;&#35486;</h3>",
    );
    expect(article.tableOfContents.map((item) => item.text)).toEqual([
      "React & TypeScript 😀",
      '<div> "属性" 日本語',
    ]);
    expect(article.html).toContain("&lt;div&gt;");
    expect(article.text).toContain("React & TypeScript 😀");
  });

  test("preserves literal entity examples without decoding twice", () => {
    const article = sanitizeMicroCmsArticle(
      "<h2>&amp;amp; と &amp;lt; の説明</h2>",
    );
    expect(article.tableOfContents[0].text).toBe("&amp; と &lt; の説明");
    expect(article.text).toBe("&amp; と &lt; の説明");
  });

  test("removes scripts and event attributes while creating a table of contents", () => {
    const article = sanitizeMicroCmsArticle(
      '<h2 onclick="alert(1)">安全な見出し</h2><script>alert(1)</script><p>本文</p>',
    );

    expect(article.html).toContain('<h2 id="heading-1">安全な見出し</h2>');
    expect(article.html).not.toContain("onclick");
    expect(article.html).not.toContain("script");
    expect(article.text).toBe("安全な見出し本文");
    expect(article.tableOfContents).toEqual([
      { id: "heading-1", level: 2, text: "安全な見出し" },
    ]);
  });

  test("includes h2 and h3 in the table of contents but excludes h4", () => {
    const article = sanitizeMicroCmsArticle(
      "<h2>セクション</h2><h3>小見出し</h3><h4>補足見出し</h4>",
    );

    expect(article.html).toContain('<h4 id="heading-3">補足見出し</h4>');
    expect(article.tableOfContents).toEqual([
      { id: "heading-1", level: 2, text: "セクション" },
      { id: "heading-2", level: 3, text: "小見出し" },
    ]);
  });

  test("keeps only images served by the microCMS image domain", () => {
    const article = sanitizeMicroCmsArticle(
      '<img src="https://evil.example/image.png"><img src="https://images.microcms-assets.io/assets/a/b/image.png" alt="cover">',
    );

    expect(article.html).not.toContain("evil.example");
    expect(article.html).toContain(
      "https://images.microcms-assets.io/assets/a/b/image.png",
    );
    expect(article.html).toContain('loading="lazy"');
    expect(article.html).toContain('decoding="async"');
  });
});
