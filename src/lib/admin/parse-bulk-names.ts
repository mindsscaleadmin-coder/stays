/** Split pasted or typed lists into unique trimmed names (comma, semicolon, or newline). */
export function parseBulkNames(raw: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of raw.split(/[,;\n]+/)) {
    const name = part.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export function asNameList(nameOrNames: string | string[]): string[] {
  if (Array.isArray(nameOrNames)) return nameOrNames;
  return parseBulkNames(nameOrNames);
}
