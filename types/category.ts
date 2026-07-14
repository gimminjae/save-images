export type CategoryRecord = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  path: string;
  depth: number;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};
