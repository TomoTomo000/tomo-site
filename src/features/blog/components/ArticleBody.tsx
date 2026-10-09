export function ArticleBody({ html }: { html: string }) {
  return (
    <div
      className="m-article-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
