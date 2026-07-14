export const MEMORY_OBJECT_ROOT = "hanmong";

export function isMemoryObjectKey(value: string) {
  return value.startsWith(`${MEMORY_OBJECT_ROOT}/`);
}
