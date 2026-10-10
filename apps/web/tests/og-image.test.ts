import { describe, expect, test } from "bun:test";
import {
  BLOG_OG_RENDERER_VERSION,
  getBlogOgImagePath,
  layoutOgTitle,
} from "../src/features/blog/og-image";

describe("article social images", () => {
  test("article updates change the image URL and path characters are encoded", () => {
    expect(getBlogOgImagePath("a/b", "2026-09-15T00:00:00Z")).toBe(
      `/og/blog/a%2Fb?v=2026-09-15T00%3A00%3A00Z&renderer=${BLOG_OG_RENDERER_VERSION}`,
    );
    expect(getBlogOgImagePath("article", "first")).not.toBe(
      getBlogOgImagePath("article", "second"),
    );
  });

  test("Japanese words remain intact at line breaks", () => {
    const { lines } = layoutOgTitle("記事内HTMLタグ デザイン確認");
    expect(lines).toHaveLength(2);
    expect(lines.some((line) => line.includes("タグ"))).toBe(true);
    expect(lines.some((line) => line.includes("デザイン"))).toBe(true);
  });

  test("emoji and joined emoji survive title wrapping", () => {
    const title = "公開しました🎊 開発者👩🏽‍💻からのお知らせ🇯🇵 ❤️";
    const { lines } = layoutOgTitle(title);
    expect(lines.join("").replaceAll(" ", "")).toBe(title.replaceAll(" ", ""));
    for (const emoji of ["🎊", "👩🏽‍💻", "🇯🇵", "❤️"]) {
      expect(lines.some((line) => line.includes(emoji))).toBe(true);
    }
  });

  test.each([
    "CSS Gridで作るレイアウト",
    "Cloudflare WorkersとTanStack Startで日本語のOGP画像を自動生成する方法",
    "長".repeat(160),
    "W".repeat(160),
    "日本語と英語 React 19 & TypeScript <script> を安全に表示する",
  ])("the complete title fits in the central area: %s", (title) => {
    const { lines, fontSize } = layoutOgTitle(title);
    expect(lines.join("").replaceAll(" ", "")).toBe(title.replaceAll(" ", ""));
    expect(lines.length * fontSize * 1.45).toBeLessThanOrEqual(440);
    for (const line of lines) {
      const units = [...line].reduce(
        (sum, char) =>
          sum +
          (/^[\x20-\x7e]$/.test(char) && !/[MW@#%&]/.test(char) ? 0.7 : 1),
        0,
      );
      expect(units * fontSize).toBeLessThanOrEqual(1000);
    }
  });
});
