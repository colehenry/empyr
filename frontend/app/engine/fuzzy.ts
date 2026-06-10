const FUZZY_SIMILARITY_THRESHOLD = 0.8;
const MIN_FUZZY_LENGTH = 3;

const LEADING_DESCRIPTORS = [
  "grand principality of",
  "grand duchy of",
  "personal union of",
  "holy roman empire of",
  "kingdom of",
  "duchy of",
  "county of",
  "comtat of",
  "republic of",
  "principality of",
  "electorate of",
  "crown of",
  "empire of",
  "beylik of",
  "house of",
  "sultanate of",
  "khanate of",
  "emirate of",
  "state of",
  "the"
];

const TRAILING_DESCRIPTORS = [
  "empire",
  "khanate",
  "dynasty",
  "sultanate",
  "emirate",
  "monarchy",
  "republic",
  "kingdom",
  "confederation",
  "union",
  "order",
  "states"
];

export function normalizeName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function coreName(raw: string): string {
  let name = normalizeName(raw);
  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const descriptor of LEADING_DESCRIPTORS) {
      if (name.startsWith(`${descriptor} `)) {
        name = name.slice(descriptor.length + 1).trim();
        stripped = true;
      }
    }
  }
  for (const descriptor of TRAILING_DESCRIPTORS) {
    if (name.endsWith(` ${descriptor}`)) {
      name = name.slice(0, -(descriptor.length + 1)).trim();
      break;
    }
  }
  return name || normalizeName(raw);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0 || b.length === 0) {
    return Math.max(a.length, b.length);
  }
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min(previous[j] + 1, current[j - 1] + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length];
}

export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) {
    return 1;
  }
  return 1 - levenshtein(a, b) / longest;
}

export type FuzzyMatch = { match: boolean; kind: "exact" | "core" | "fuzzy" | null };

export function matchName(input: string, canonical: string): FuzzyMatch {
  const inputNorm = normalizeName(input);
  if (!inputNorm) {
    return { match: false, kind: null };
  }
  const canonicalNorm = normalizeName(canonical);
  if (inputNorm === canonicalNorm) {
    return { match: true, kind: "exact" };
  }
  const inputCore = coreName(input);
  const canonicalCore = coreName(canonical);
  if (inputNorm === canonicalCore || inputCore === canonicalNorm || inputCore === canonicalCore) {
    return { match: true, kind: "core" };
  }
  const pairs: Array<[string, string]> = [
    [inputNorm, canonicalNorm],
    [inputNorm, canonicalCore],
    [inputCore, canonicalCore]
  ];
  for (const [a, b] of pairs) {
    if (a.length >= MIN_FUZZY_LENGTH && b.length >= MIN_FUZZY_LENGTH && similarity(a, b) >= FUZZY_SIMILARITY_THRESHOLD) {
      return { match: true, kind: "fuzzy" };
    }
  }
  return { match: false, kind: null };
}
