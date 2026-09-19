export function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
}

export function mergeTags(current: string[], additions: string[]): string[] {
  const seen = new Set<string>();
  return [...current, ...additions].map(value => value.trim().replace(/\s+/g, ' ')).filter(value => {
    const key = normalizeTag(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** A comma commits completed tags; Enter, add and blur also commit the last word. */
export function parseTagInput(input: string, commitLast = false) {
  const parts = input.split(/[,\n]+/);
  const inputValue = commitLast ? '' : parts.pop() ?? '';
  return { tags: mergeTags([], parts), inputValue };
}
