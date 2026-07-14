"use client";

/* eslint-disable @next/next/no-img-element */

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { readImageDimensions } from "@/lib/browser-images";
import type { CategoryRecord } from "@/types/category";
import type { MemoryRecord } from "@/types/memory";

type ImageManagerProps = {
  categories: CategoryRecord[];
  initialMemories: MemoryRecord[];
};

type ManagerFeedback =
  | {
      message: string;
      tone: "success" | "warning";
    }
  | null;

function ImageManagerCard({
  categories,
  memory,
  onDeleted,
  onUpdated,
}: {
  categories: CategoryRecord[];
  memory: MemoryRecord;
  onDeleted: (memoryId: string, memoryName: string, warning?: string) => void;
  onUpdated: (memory: MemoryRecord) => void;
}) {
  const [name, setName] = useState(memory.name);
  const [categoryId, setCategoryId] = useState(memory.categoryId ?? "");
  const [isCategoryFeatured, setIsCategoryFeatured] = useState(
    memory.isCategoryFeatured,
  );
  const [isMainFeatured, setIsMainFeatured] = useState(memory.isMainFeatured);
  const [isVisible, setIsVisible] = useState(memory.isVisible);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isBusy = isSaving || isDeleting;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = new FormData();
      payload.append("name", name);
      payload.append("categoryId", categoryId);
      payload.append("isVisible", String(isVisible));
      payload.append("isCategoryFeatured", String(isCategoryFeatured));
      payload.append("isMainFeatured", String(isMainFeatured));

      if (file) {
        const { width, height } = await readImageDimensions(file);
        payload.append("image", file);
        payload.append("imageWidth", String(width));
        payload.append("imageHeight", String(height));
      }

      const response = await fetch(`/api/admin/memories/${memory.id}`, {
        method: "PATCH",
        body: payload,
      });
      const result = (await response.json()) as {
        error?: string;
        memory?: MemoryRecord;
      };

      if (!response.ok || !result.memory) {
        throw new Error(result.error || "수정에 실패했어요.");
      }

      onUpdated(result.memory);
      setSuccessMessage("이미지를 저장했어요.");
      setFile(null);
      setPreviewUrl((currentPreviewUrl) => {
        if (currentPreviewUrl) {
          URL.revokeObjectURL(currentPreviewUrl);
        }

        return null;
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "수정에 실패했어요.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`"${memory.name}" 이미지를 삭제할까요?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/memories/${memory.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as {
        error?: string;
        warning?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "삭제에 실패했어요.");
      }

      onDeleted(memory.id, memory.name, result.warning);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "삭제에 실패했어요.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article className="rounded-[28px] border border-sky-300/65 bg-white/88 p-4 shadow-[0_16px_28px_rgba(33,110,178,0.12)] sm:p-5">
      <div className="flex flex-wrap gap-2">
        {memory.category?.name ? (
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
            {memory.category.name}
          </span>
        ) : null}
        {isCategoryFeatured ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
            대표 이미지
          </span>
        ) : null}
        {isMainFeatured ? (
          <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-black text-fuchsia-700">
            메인 노출
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex h-[220px] items-center justify-center overflow-hidden rounded-[22px] border border-white/70 bg-sky-50 p-3 sm:h-[280px]">
        <img
          src={previewUrl || memory.imageUrl}
          alt={name}
          className="max-h-full w-auto max-w-full object-contain"
        />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-900">이름</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="event-input h-[48px] rounded-[16px] px-4 text-sm text-slate-900 outline-none"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-900">카테고리</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="event-input h-[48px] rounded-[16px] px-4 text-sm text-slate-900 outline-none"
          >
            <option value="">카테고리 선택</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {"· ".repeat(category.depth)}
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-900">이미지 교체</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setFile(nextFile);
              setPreviewUrl((currentPreviewUrl) => {
                if (currentPreviewUrl) {
                  URL.revokeObjectURL(currentPreviewUrl);
                }

                return nextFile ? URL.createObjectURL(nextFile) : null;
              });
            }}
            className="event-input block w-full rounded-[16px] px-4 py-3 text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-sky-500 file:px-4 file:py-2.5 file:text-sm file:font-black file:text-white"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-3 rounded-[18px] border border-sky-200/80 bg-sky-50/70 px-4 py-3 text-sm font-black text-slate-900">
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(event) => setIsVisible(event.target.checked)}
              className="h-4 w-4 rounded border-sky-300 text-sky-500"
            />
            공개 노출
          </label>
          <label className="flex items-center gap-3 rounded-[18px] border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm font-black text-slate-900">
            <input
              type="checkbox"
              checked={isCategoryFeatured}
              onChange={(event) => setIsCategoryFeatured(event.target.checked)}
              className="h-4 w-4 rounded border-amber-300 text-amber-500"
            />
            대표 이미지
          </label>
          <label className="flex items-center gap-3 rounded-[18px] border border-fuchsia-200/80 bg-fuchsia-50/80 px-4 py-3 text-sm font-black text-slate-900">
            <input
              type="checkbox"
              checked={isMainFeatured}
              onChange={(event) => setIsMainFeatured(event.target.checked)}
              className="h-4 w-4 rounded border-fuchsia-300 text-fuchsia-500"
            />
            메인 노출
          </label>
        </div>

        {errorMessage ? (
          <div className="rounded-[18px] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-[18px] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isBusy}
            className="inline-flex h-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-5 text-sm font-black text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "삭제 중..." : "삭제"}
          </button>
          <button
            type="submit"
            disabled={isBusy || !name.trim() || !categoryId}
            className="event-button-primary inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </article>
  );
}

export function ImageManager({
  categories,
  initialMemories,
}: ImageManagerProps) {
  const [memories, setMemories] = useState(initialMemories);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [feedback, setFeedback] = useState<ManagerFeedback>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const filteredMemories = useMemo(() => {
    return memories.filter((memory) => {
      const matchesCategory = selectedCategoryId
        ? memory.categoryId === selectedCategoryId
        : true;
      const matchesName = normalizedSearchQuery
        ? memory.name.toLowerCase().includes(normalizedSearchQuery)
        : true;

      return matchesCategory && matchesName;
    });
  }, [memories, normalizedSearchQuery, selectedCategoryId]);

  const mainFeaturedCount = memories.filter((memory) => memory.isMainFeatured).length;
  const categoryFeaturedCount = memories.filter(
    (memory) => memory.isCategoryFeatured,
  ).length;

  return (
    <section className="event-panel rounded-[32px] px-4 py-5 sm:rounded-[36px] sm:px-6 sm:py-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-950 sm:text-4xl">
            이미지 관리
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/85 px-4 py-2 text-sm font-black text-sky-950">
            전체 {memories.length}장
          </span>
          <span className="rounded-full bg-fuchsia-100 px-4 py-2 text-sm font-black text-fuchsia-700">
            메인 {mainFeaturedCount}장
          </span>
          <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-700">
            대표 {categoryFeaturedCount}장
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-[24px] border border-sky-200/70 bg-white/75 p-4 lg:grid-cols-[1fr_260px_auto]">
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="이름으로 검색"
          className="event-input h-[48px] rounded-[16px] px-4 text-sm text-slate-900 outline-none"
        />
        <select
          value={selectedCategoryId}
          onChange={(event) => setSelectedCategoryId(event.target.value)}
          className="event-input h-[48px] rounded-[16px] px-4 text-sm text-slate-900 outline-none"
        >
          <option value="">전체 카테고리</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {"· ".repeat(category.depth)}
              {category.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setSelectedCategoryId("");
          }}
          className="event-button-secondary inline-flex h-[48px] items-center justify-center rounded-full px-5 text-sm font-black text-sky-950"
        >
          필터 초기화
        </button>
      </div>

      {feedback ? (
        <div
          className={`mt-4 rounded-[20px] border px-4 py-3 text-sm ${
            feedback.tone === "warning"
              ? "border-amber-200 bg-amber-50/90 text-amber-800"
              : "border-emerald-200 bg-emerald-50/90 text-emerald-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {filteredMemories.map((memory) => (
          <ImageManagerCard
            key={memory.id}
            categories={categories}
            memory={memory}
            onUpdated={(updatedMemory) => {
              setMemories((current) =>
                current.map((item) =>
                  item.id === updatedMemory.id ? updatedMemory : item,
                ),
              );
              setFeedback({
                message: `"${updatedMemory.name}" 이미지를 저장했어요.`,
                tone: "success",
              });
            }}
            onDeleted={(memoryId, memoryName, warning) => {
              setMemories((current) =>
                current.filter((item) => item.id !== memoryId),
              );
              setFeedback({
                message: warning || `"${memoryName}" 이미지를 삭제했어요.`,
                tone: warning ? "warning" : "success",
              });
            }}
          />
        ))}
      </div>

      {filteredMemories.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-sky-300/70 bg-white/75 px-6 py-10 text-center text-sm font-bold text-slate-600">
          조건에 맞는 이미지가 없습니다.
        </div>
      ) : null}
    </section>
  );
}
