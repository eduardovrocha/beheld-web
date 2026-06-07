/* ============================================================
   Static data for repeating blocks.
   Strings come from i18n (landingV2.* keys) via T.tsx.
   ============================================================ */

export const HERO_VARIANTS = ["a", "b", "c", "d"] as const;
export type HeroVariant = (typeof HERO_VARIANTS)[number];

/* --- B3H31D (section 02) — 4 attribute cards --------------------- */
export const B3H31D_CARDS = [
  { key: "local", accent: false },
  { key: "signals", accent: false },
  { key: "bundle", accent: false },
  { key: "cost", accent: true }, // value rendered in signal-green
] as const;

/* --- Privacy table rows ------------------------------------------- */
export const PRIVACY_ROWS = ["paths", "cwd", "secrets", "content"] as const;

/* --- Steps (section 03) ------------------------------------------- */
export const STEPS = [
  { key: "install", cmd: true },
  { key: "continuous", cmd: false },
  { key: "snapshot", cmd: true },
] as const;

/* --- Why-install (between thesis and B3H31D) ---------------------- */
export const WHY_INSTALL_CARDS = ["memory", "streak", "private"] as const;

/* --- Claimed vs Demonstrated (section 05) ------------------------- */
export const CVD_ROWS = [
  { key: "stack", badge: "ok" },
  { key: "seniority", badge: "ok" },
  { key: "react", badge: "warn" },
  { key: "employment", badge: "null" },
] as const;

/* --- "Não faz" list (section 06) --------------------------------- */
export const NOTS = ["cloud", "code", "score", "share", "charge", "lockin"] as const;

/* --- Chain rows --------------------------------------------------- */
export const CHAIN_ROWS = ["signature", "chainHash", "identity", "engine", "rekor"] as const;

/* --- FAQ ---------------------------------------------------------- */
export const FAQ_ITEMS = [
  "spyware",
  "captures",
  "whoSees",
  "free",
  "performance",
  "binary",
  "whyNow",
] as const;

/* --- Scenes (section 07) ------------------------------------------ */
export const SCENES = [
  { key: "rejected", final: false },
  { key: "career", final: false },
  { key: "freelance", final: false },
  { key: "international", final: false },
  { key: "closing", final: true },
] as const;

/* --- Triangle band lines ------------------------------------------ */
export const TRIANGLE_LINES = [
  { brand: "github", verb: "proves", term: "code", us: false },
  { brand: "linkedin", verb: "proves", term: "employment", us: false },
  { brand: "beheld", verb: "attests", term: "practice", us: true },
] as const;
