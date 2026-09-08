import type { ExtraFilter } from "@/lib/admin/taxonomy-types";

/** Extra filters with no parentId apply to every parent; otherwise must match. */
export function extraFilterMatchesParent(
  filter: Pick<ExtraFilter, "parentId">,
  parentId: string | undefined | null
): boolean {
  if (!filter.parentId) return true;
  if (!parentId) return false;
  return filter.parentId === parentId;
}
