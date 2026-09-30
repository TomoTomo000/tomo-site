export type Taxonomy = {
  id: string;
  name: string;
  slug: string;
};

export type Asset = {
  id: string;
  displayUrl: string;
  width: number;
  height: number;
  altText: string;
};

export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  tags: Taxonomy[];
  cover: Asset | null;
  publishedAt: string | null;
  updatedAt: string;
  readingMinutes: number;
};

export type PostDetail = PostSummary & {
  description: string;
  contentHtml: string;
  tableOfContents: Array<{
    id: string;
    level: number;
    text: string;
  }>;
};

export type PaginatedPosts = {
  items: PostSummary[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};
