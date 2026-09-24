// Merge fresh saved values without replacing fields edited since the previous snapshot.
export function mergeDraft<T extends object>(draft: T, previous: T, incoming: T): T {
  const merged = { ...incoming };
  for (const key of Object.keys(incoming) as (keyof T)[]) {
    if (!Object.is(draft[key], previous[key])) merged[key] = draft[key];
  }
  return merged;
}
export function mergeActionDrafts<T extends { id: string; position: number }>(draft: T[], previous: T[], incoming: T[]): T[] {
  return incoming.map(saved => {
    const old = previous.find(item => item.id === saved.id);
    const edited = draft.find(item => item.id === saved.id);
    return old && edited ? { ...mergeDraft(edited, old, saved), position: saved.position } : saved;
  });
}
