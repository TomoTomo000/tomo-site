export function createPostDescription(
  description: string | null | undefined,
  articleText: string,
): string {
  const configured = description?.trim();
  if (configured) return configured;

  const text = articleText.replace(/\s+/g, " ").trim();
  const characters = Array.from(text);
  return characters.length > 160
    ? `${characters.slice(0, 160).join("")}…`
    : text;
}
