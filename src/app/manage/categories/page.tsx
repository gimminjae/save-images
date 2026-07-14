import { getCategoryTree } from "@/lib/data/categories";

export default async function ManageCategoriesPage() {
  const categories = await getCategoryTree();

  return (
    <div className="space-y-8 py-10">
      <section className="glass-panel rounded-[32px] px-6 py-8 sm:px-8">
        <p className="eyebrow">Category Manager</p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl font-bold sm:text-4xl">
          카테고리 구조
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-black/65">
          현재는 트리 구조를 점검하고, `/api/categories` 라우트와 함께 실제 CRUD
          연결을 시작할 수 있는 상태입니다.
        </p>
      </section>

      <section className="space-y-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="glass-panel rounded-[24px] px-5 py-4"
            style={{ marginLeft: `${category.depth * 18}px` }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{category.name}</p>
                <p className="mt-1 text-sm text-black/55">{category.path}</p>
              </div>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                depth {category.depth}
              </span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
