export const BLOG_OG_WIDTH = 1200;
export const BLOG_OG_HEIGHT = 630;
export const BLOG_OG_RENDERER_VERSION = "4";

export function getBlogOgImagePath(slug: string, updatedAt: string): string {
  return `/og/blog/${encodeURIComponent(slug)}?v=${encodeURIComponent(updatedAt)}&renderer=${BLOG_OG_RENDERER_VERSION}`;
}

// 欧文フォントの文字幅の違いや句読点を考慮し、文字幅を広めに見積もる。
export function layoutOgTitle(title: string) {
  const text = title.replace(/\s+/gu, " ").trim();
  const graphemes = (value: string) =>
    [
      ...new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(value),
    ].map(({ segment }) => segment);
  const width = (value: string) =>
    graphemes(value).reduce(
      (sum, glyph) =>
        sum +
        (/^[\x20-\x7e]$/.test(glyph) && !/[MW@#%&]/.test(glyph) ? 0.7 : 1),
      0,
    );
  const total = width(text);
  const words = [
    ...new Intl.Segmenter("ja", { granularity: "word" }).segment(text),
  ].map(({ segment }) => segment);

  for (let fontSize = 72; fontSize >= 32; fontSize -= 2) {
    const capacity = 1000 / fontSize;
    const tokens = words.flatMap((word) =>
      width(word) > capacity ? graphemes(word) : [word],
    );
    const prefix = [0];
    for (const token of tokens)
      prefix.push(prefix[prefix.length - 1] + width(token));
    const maxLines = Math.floor(440 / (fontSize * 1.45));
    for (
      let count = Math.max(1, Math.ceil(total / capacity));
      count <= maxLines;
      count++
    ) {
      const target = total / count;
      const costs = Array.from({ length: count + 1 }, () =>
        Array<number>(tokens.length + 1).fill(Infinity),
      );
      const breaks = Array.from({ length: count + 1 }, () =>
        Array<number>(tokens.length + 1).fill(-1),
      );
      costs[0][0] = 0;
      for (let row = 1; row <= count; row++) {
        for (let end = row; end <= tokens.length; end++) {
          for (let start = end - 1; start >= row - 1; start--) {
            const units = prefix[end] - prefix[start];
            if (units > capacity) break;
            const closing = /^[、。，．！？!?）」』】〕〉》：:；;]+$/u.test(
              tokens[start],
            );
            const cost =
              costs[row - 1][start] +
              (units - target) ** 2 +
              (closing ? 100 : 0);
            if (cost < costs[row][end]) {
              costs[row][end] = cost;
              breaks[row][end] = start;
            }
          }
        }
      }
      if (!Number.isFinite(costs[count][tokens.length])) continue;
      const lines: string[] = [];
      let end = tokens.length;
      for (let row = count; row > 0; row--) {
        const start = breaks[row][end];
        lines.unshift(tokens.slice(start, end).join("").trim());
        end = start;
      }
      return { fontSize, lines };
    }
  }
  throw new Error("OG title exceeds the supported length");
}
