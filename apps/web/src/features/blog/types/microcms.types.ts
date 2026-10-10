export type MicroCmsImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type MicroCmsTaxonomy = {
  id: string;
  name: string;
};

export type MicroCmsPost = {
  id: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  revisedAt?: string;
  title: string;
  description?: string | null;
  content: string;
  coverImage?: MicroCmsImage | null;
  tags: MicroCmsTaxonomy[];
};

export type MicroCmsListResponse<T> = {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
};
