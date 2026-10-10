export type BlogSearch = { page: number; query: string; tag: string };
export function blogUrl(search: Partial<BlogSearch> = {}) {
  const params = new URLSearchParams();
  if (search.page && search.page !== 1) params.set("page", String(search.page));
  if (search.query) params.set("query", search.query);
  if (search.tag) params.set("tag", search.tag);
  const query = params.toString();
  return "/blog" + (query ? "?" + query : "");
}
