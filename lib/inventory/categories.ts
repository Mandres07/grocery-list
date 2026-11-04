export interface InventoryCategory { id: string; name: string; parentId: string | null }

export function categoryLabels(categories: InventoryCategory[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return categories.map((category) => {
    const names = [category.name];
    const seen = new Set([category.id]);
    let parent = category.parentId;
    while (parent && !seen.has(parent) && names.length <= 100) {
      seen.add(parent);
      const record = byId.get(parent);
      if (!record) break;
      names.unshift(record.name);
      parent = record.parentId;
    }
    return { ...category, label: names.join(" / ") };
  }).sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function descendantCategoryIds(categories: InventoryCategory[], id: string) {
  const selected = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) if (category.parentId && selected.has(category.parentId) && !selected.has(category.id)) {
      selected.add(category.id);
      changed = true;
    }
  }
  return [...selected];
}
