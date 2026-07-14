import { notFound } from "next/navigation";

import { MediaCard } from "@/components/media-card";
import { getCategoryByPath } from "@/lib/data/categories";
import { listMedia } from "@/lib/data/media";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  const category = await getCategoryByPath(path);

  if (!category) {
    notFound();
  }

  const media = await listMedia({
    categoryId: category.id,
    limit: 24,
  });

  return (
    <div className="space-y-8 py-10">
      <section className="glass-panel rounded-[32px] px-6 py-8 sm:px-8">
        <p className="eyebrow">Category</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl font-bold sm:text-4xl">
          {category.name}
        </h1>
        <p className="mt-3 text-sm text-black/55">{category.path}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {media.length ? (
          media.map((item) => <MediaCard key={item.id} item={item} />)
        ) : (
          <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/70 px-5 py-12 text-center text-black/55">
            아직 이 카테고리에는 미디어가 없습니다.
          </div>
        )}
      </section>
    </div>
  );
}
