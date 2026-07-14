"use client";

import { useMemo, useState, useTransition } from "react";

import type { CategoryRecord } from "@/types/category";

type CategoryManagerProps = {
  initialCategories: CategoryRecord[];
};

type CategoryDraft = {
  name: string;
  parentId: string;
  sortOrder: string;
};

function toDraft(category?: CategoryRecord): CategoryDraft {
  return {
    name: category?.name ?? "",
    parentId: category?.parentId ?? "",
    sortOrder: String(category?.sortOrder ?? 0),
  };
}

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "요청을 처리하지 못했어요.",
    );
  }

  return payload as T;
}

export function CategoryManager({
  initialCategories,
}: CategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [createDraft, setCreateDraft] = useState<CategoryDraft>(toDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CategoryDraft>(toDraft());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const childCountById = useMemo(() => {
    return categories.reduce<Record<string, number>>((acc, category) => {
      if (category.parentId) {
        acc[category.parentId] = (acc[category.parentId] ?? 0) + 1;
      }

      return acc;
    }, {});
  }, [categories]);

  async function refreshCategories() {
    const payload = await readJson<{ categories: CategoryRecord[] }>(
      "/api/categories/tree",
    );

    startTransition(() => {
      setCategories(payload.categories);
    });
  }

  async function handleCreate() {
    if (!createDraft.name.trim()) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      await readJson("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createDraft.name,
          parentId: createDraft.parentId || null,
          sortOrder: Number(createDraft.sortOrder) || 0,
        }),
      });

      setCreateDraft(toDraft());
      setMessage("카테고리를 추가했어요.");
      await refreshCategories();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "카테고리를 추가하지 못했어요.",
      );
    }
  }

  function beginEdit(category: CategoryRecord) {
    setEditingId(category.id);
    setEditDraft(toDraft(category));
    setMessage(null);
    setError(null);
  }

  async function handleSave(categoryId: string) {
    if (!editDraft.name.trim()) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      await readJson(`/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editDraft.name,
          parentId: editDraft.parentId || null,
          sortOrder: Number(editDraft.sortOrder) || 0,
        }),
      });

      setEditingId(null);
      setMessage("카테고리를 수정했어요.");
      await refreshCategories();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "카테고리를 수정하지 못했어요.",
      );
    }
  }

  async function handleDelete(category: CategoryRecord) {
    const childCount = childCountById[category.id] ?? 0;

    if (childCount > 0) {
      setError("하위 카테고리를 먼저 정리해 주세요.");
      setMessage(null);
      return;
    }

    if (!window.confirm(`"${category.name}" 카테고리를 삭제할까요?`)) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      await readJson(`/api/categories/${category.id}`, {
        method: "DELETE",
      });

      if (editingId === category.id) {
        setEditingId(null);
      }

      setMessage("카테고리를 삭제했어요.");
      await refreshCategories();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "카테고리를 삭제하지 못했어요.",
      );
    }
  }

  return (
    <section className="event-panel rounded-[32px] px-4 py-5 sm:rounded-[36px] sm:px-6 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
          카테고리
        </h1>
        <span className="rounded-full bg-white/85 px-4 py-2 text-sm font-black text-sky-950">
          총 {categories.length}개
        </span>
      </div>

      <div className="mt-5 grid gap-3 rounded-[26px] border border-sky-200/70 bg-white/70 p-4 md:grid-cols-[1.2fr_1fr_120px_auto]">
        <input
          value={createDraft.name}
          onChange={(event) =>
            setCreateDraft((current) => ({
              ...current,
              name: event.target.value,
            }))
          }
          disabled={isPending}
          placeholder="새 카테고리 이름"
          className="event-input h-[48px] rounded-[16px] px-4 text-sm text-slate-900 outline-none"
        />
        <select
          value={createDraft.parentId}
          onChange={(event) =>
            setCreateDraft((current) => ({
              ...current,
              parentId: event.target.value,
            }))
          }
          disabled={isPending}
          className="event-input h-[48px] rounded-[16px] px-4 text-sm text-slate-900 outline-none"
        >
          <option value="">루트</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {"· ".repeat(category.depth)}
              {category.name}
            </option>
          ))}
        </select>
        <input
          value={createDraft.sortOrder}
          onChange={(event) =>
            setCreateDraft((current) => ({
              ...current,
              sortOrder: event.target.value,
            }))
          }
          disabled={isPending}
          inputMode="numeric"
          placeholder="정렬"
          className="event-input h-[48px] rounded-[16px] px-4 text-sm text-slate-900 outline-none"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending || !createDraft.name.trim()}
          className="event-button-primary inline-flex h-[48px] w-full items-center justify-center rounded-full px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          추가
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-[20px] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {categories.map((category) => {
          const isEditing = editingId === category.id;

          return (
            <article
              key={category.id}
              className="rounded-[24px] border border-sky-200/70 bg-white/82 p-4 shadow-[0_12px_22px_rgba(33,110,178,0.08)]"
            >
              {isEditing ? (
                <div className="grid gap-3 md:grid-cols-[1.1fr_1fr_120px_auto_auto]">
                  <input
                    value={editDraft.name}
                    onChange={(event) =>
                      setEditDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="event-input h-[46px] rounded-[16px] px-4 text-sm text-slate-900 outline-none"
                  />
                  <select
                    value={editDraft.parentId}
                    onChange={(event) =>
                      setEditDraft((current) => ({
                        ...current,
                        parentId: event.target.value,
                      }))
                    }
                    className="event-input h-[46px] rounded-[16px] px-4 text-sm text-slate-900 outline-none"
                  >
                    <option value="">루트</option>
                    {categories
                      .filter((item) => item.id !== category.id)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {"· ".repeat(item.depth)}
                          {item.name}
                        </option>
                      ))}
                  </select>
                  <input
                    value={editDraft.sortOrder}
                    onChange={(event) =>
                      setEditDraft((current) => ({
                        ...current,
                        sortOrder: event.target.value,
                      }))
                    }
                    inputMode="numeric"
                    className="event-input h-[46px] rounded-[16px] px-4 text-sm text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSave(category.id)}
                    className="event-button-primary inline-flex h-[46px] w-full items-center justify-center rounded-full px-5 text-sm font-black text-white md:w-auto"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="event-button-secondary inline-flex h-[46px] w-full items-center justify-center rounded-full px-5 text-sm font-black text-sky-950 md:w-auto"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-black tracking-[-0.04em] text-slate-950">
                        {"· ".repeat(category.depth)}
                        {category.name}
                      </p>
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
                        depth {category.depth}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-sm text-slate-500">
                      {category.path}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => beginEdit(category)}
                      className="event-button-secondary inline-flex h-10 w-full items-center justify-center rounded-full px-4 text-sm font-black text-sky-950 sm:w-auto"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(category)}
                      className="inline-flex h-10 w-full items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-700 sm:w-auto"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
