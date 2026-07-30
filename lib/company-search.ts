export type SearchableCompanyUser = {
  displayName: string;
  mail: string;
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function orderedLetterPenalty(source: string, query: string) {
  let sourceIndex = 0;
  let penalty = 0;
  for (const letter of query) {
    const matchIndex = source.indexOf(letter, sourceIndex);
    if (matchIndex < 0) return null;
    penalty += matchIndex - sourceIndex;
    sourceIndex = matchIndex + 1;
  }
  return penalty;
}

export function computeCompanyUserSearchScore(displayName: string, mail: string, query: string) {
  const q = normalizeSearchText(query);
  if (!q) return 0;

  const name = normalizeSearchText(displayName);
  const email = normalizeSearchText(mail);
  const compactQuery = q.replace(/[^a-z0-9]/g, "");
  const compactName = name.replace(/[^a-z0-9]/g, "");
  const nameWords = name.split(" ");

  if (name === q) return 1_000_000;
  if (name.startsWith(q)) return 900_000 - Math.min(name.length - q.length, 10_000);
  if (compactQuery && compactName.startsWith(compactQuery)) {
    return 850_000 - Math.min(compactName.length - compactQuery.length, 10_000);
  }

  const wordIndex = nameWords.findIndex((word) => word.startsWith(q));
  if (wordIndex >= 0) return 800_000 - wordIndex * 1_000 - Math.min(nameWords[wordIndex].length - q.length, 999);

  const containedAt = name.indexOf(q);
  if (containedAt >= 0) return 700_000 - containedAt * 100;

  if (compactQuery) {
    const orderedPenalty = orderedLetterPenalty(compactName, compactQuery);
    if (orderedPenalty !== null) return 600_000 - Math.min(orderedPenalty, 100_000);
  }

  const emailPrefix = email.split("@")[0];
  if (email === q || emailPrefix === q) return 500_000;
  if (emailPrefix.startsWith(q)) return 400_000;
  if (email.includes(q)) return 300_000;

  return 0;
}

export function compareCompanyUsersBySearch<T extends SearchableCompanyUser>(a: T, b: T, query: string) {
  const scoreDifference =
    computeCompanyUserSearchScore(b.displayName, b.mail, query) -
    computeCompanyUserSearchScore(a.displayName, a.mail, query);
  return scoreDifference || a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
}