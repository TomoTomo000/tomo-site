import sanitizeHtml from "sanitize-html";

export type HtmlTableOfContentsItem = {
  id: string;
  level: number;
  text: string;
};

type SanitizedArticle = {
  html: string;
  text: string;
  tableOfContents: HtmlTableOfContentsItem[];
};

function allowedImageUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "images.microcms-assets.io";
  } catch {
    return false;
  }
}

function plainText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  })
    // sanitize-html re-escapes these characters; React expects plain text.
    // Decode once so literal entity examples such as &amp; stay intact.
    .replace(/&(amp|lt|gt);/g, (_, entity: string) =>
      ({ amp: "&", lt: "<", gt: ">" })[entity]!,
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeMicroCmsArticle(value: string): SanitizedArticle {
  let headingIndex = 0;
  const sanitized = sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "h2",
      "h3",
      "h4",
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
      "tr",
      "th",
      "td",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading", "decoding"],
      h2: ["id"],
      h3: ["id"],
      h4: ["id"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    exclusiveFilter(frame) {
      return frame.tag === "img" && !allowedImageUrl(frame.attribs.src);
    },
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          ...(attribs.target === "_blank"
            ? { rel: "nofollow noopener noreferrer" }
            : {}),
        },
      }),
      img: (_tagName, attribs) => ({
        tagName: "img",
        attribs: {
          ...attribs,
          alt: attribs.alt ?? "",
          loading: "lazy",
          decoding: "async",
        },
      }),
      h2: (_tagName, attribs) => ({
        tagName: "h2",
        attribs: { ...attribs, id: `heading-${++headingIndex}` },
      }),
      h3: (_tagName, attribs) => ({
        tagName: "h3",
        attribs: { ...attribs, id: `heading-${++headingIndex}` },
      }),
      h4: (_tagName, attribs) => ({
        tagName: "h4",
        attribs: { ...attribs, id: `heading-${++headingIndex}` },
      }),
    },
  });

  const tableOfContents: HtmlTableOfContentsItem[] = [];
  const headingPattern = /<h([2-3]) id="(heading-\d+)">([\s\S]*?)<\/h\1>/g;
  for (const match of sanitized.matchAll(headingPattern)) {
    tableOfContents.push({
      level: Number(match[1]),
      id: match[2],
      text: plainText(match[3]),
    });
  }

  return {
    html: sanitized,
    text: plainText(sanitized),
    tableOfContents,
  };
}
