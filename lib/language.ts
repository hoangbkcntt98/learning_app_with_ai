export const LANGUAGE_OPTIONS = [
  "Japanese",
  "English",
  "Indonesia",
  "Thai",
  "Vietnamese",
] as const;

export type SupportedLanguage = (typeof LANGUAGE_OPTIONS)[number];

export function normalizeSupportedLanguage(input?: string | null): SupportedLanguage {
  const value = (input ?? "").trim().toLowerCase();
  switch (value) {
    case "english":
      return "English";
    case "indonesian":
    case "indonesia":
      return "Indonesia";
    case "thai":
      return "Thai";
    case "vietnamese":
      return "Vietnamese";
    case "japanese":
    default:
      return "Japanese";
  }
}

export const DEFAULT_LANGUAGE: SupportedLanguage = normalizeSupportedLanguage(
  process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE,
);
