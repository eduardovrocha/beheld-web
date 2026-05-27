/**
 * Structured parser for job-posting markdown.
 *
 * Splits the .md content into five canonical sections:
 *   - responsibilities  (Responsabilidade / Responsibilities)
 *   - technical_stack   (Technical Stack / Tecnologias)
 *   - requirements      (Requirements / Requisitos)
 *   - qualifications    (Qualifications / Qualificações)
 *   - nice_to_have      (Nice to Have / Diferenciais)
 *
 * Strategy: walk line-by-line. A markdown heading (lines starting with one
 * or more `#`) marks the start of a new section IF its text matches one of
 * the keyword lists below (case-insensitive, accent-insensitive, in PT or
 * EN). Everything between two matched headings belongs to the first one.
 * Content before any matched heading is dropped — the form's freeform
 * "description" field stays separate.
 *
 * If the file has no headings or none match, we surface that to the caller
 * so the import widget can fall back to dumping raw text into a single
 * field (legacy behavior).
 */

export const SECTION_KEYS = [
  "responsibilities",
  "technical_stack",
  "requirements",
  "qualifications",
  "nice_to_have",
] as const;

export type SectionKey = typeof SECTION_KEYS[number];

export type Sections = Partial<Record<SectionKey, string>>;

// Heading keyword dictionary. Keys are lowercased + accent-normalized for
// matching; the canonical SectionKey it maps to is the value.
const KEYWORD_MAP: Record<string, SectionKey> = {};

const KEYWORDS: Record<SectionKey, string[]> = {
  responsibilities: [
    "responsabilidade", "responsabilidades",
    "responsibilities", "responsibility",
    "atribuicoes", "atribuições",
    "atividades",
    "what you'll do", "what you will do",
    "o que voce fara", "o que você fará",
    "day to day", "day-to-day",
  ],
  technical_stack: [
    "technical stack", "tech stack", "stack",
    "stack tecnica", "stack técnica", "stack técnico", "stack tecnico",
    "tecnologias", "technologies",
    "tools", "ferramentas",
  ],
  requirements: [
    "requirements", "required",
    "requisitos", "requisitos minimos", "requisitos mínimos",
    "pre-requisitos", "pré-requisitos",
    "must have", "must-have",
    "obrigatorio", "obrigatório", "obrigatorios", "obrigatórios",
  ],
  qualifications: [
    "qualifications", "qualification",
    "qualificacoes", "qualificações", "qualificacao", "qualificação",
    "experiencia", "experiência",
    "experience",
    "background",
    "skills",
    "perfil",
  ],
  nice_to_have: [
    "nice to have", "nice-to-have",
    "diferencial", "diferenciais",
    "desejavel", "desejável", "desejaveis", "desejáveis",
    "plus", "bonus", "bônus",
    "extras",
  ],
};

for (const [key, list] of Object.entries(KEYWORDS) as [SectionKey, string[]][]) {
  for (const k of list) KEYWORD_MAP[normalize(k)] = key;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")          // strip accents
    .replace(/[*_`~]/g, "")                  // strip md emphasis chars
    .replace(/[^\w\s-]/g, " ")               // collapse punctuation
    .replace(/\s+/g, " ")
    .trim();
}

// Match e.g. "##  Responsibilities ##", "### **Stack Técnica**", "# Reqs"
// Captures group 1 = the heading text (sans #'s).
const HEADING_RE = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;

export interface ParseResult {
  sections:    Sections;
  matched:     SectionKey[];   // sections that the parser actually filled
  unmatched:   string[];       // heading texts found but not recognized
  hadHeadings: boolean;
}

export function parsePositionMarkdown(md: string): ParseResult {
  const lines = md.split(/\r?\n/);

  const out: Sections     = {};
  const matched: SectionKey[] = [];
  const unmatched: string[]   = [];

  let current: SectionKey | null = null;
  let buffer: string[] = [];
  let hadHeadings = false;

  function flush() {
    if (current === null) return;
    const text = buffer.join("\n").trim();
    if (text.length > 0) {
      out[current] = text;
      if (!matched.includes(current)) matched.push(current);
    }
    buffer = [];
  }

  for (const line of lines) {
    const m = HEADING_RE.exec(line);
    if (m) {
      hadHeadings = true;
      flush();
      const text = m[1];
      const key  = KEYWORD_MAP[normalize(text)];
      if (key) {
        current = key;
      } else {
        // Heading found but doesn't match any known section — close out
        // the current section (so leakage into wrong bucket doesn't happen)
        // and remember it for caller diagnostics.
        current = null;
        unmatched.push(text);
      }
      continue;
    }
    if (current !== null) buffer.push(line);
  }
  flush();

  return { sections: out, matched, unmatched, hadHeadings };
}

// Convenience: read a File and return parsed sections + a usable raw text.
export async function parseFromFile(file: File): Promise<ParseResult & { raw: string }> {
  const raw = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error ?? new Error("falha ao ler arquivo"));
    r.readAsText(file, "utf-8");
  });
  return { raw, ...parsePositionMarkdown(raw) };
}

// User-facing labels for each section, in PT.
export const SECTION_LABELS: Record<SectionKey, string> = {
  responsibilities: "Responsabilidades",
  technical_stack:  "Technical Stack",
  requirements:     "Requirements",
  qualifications:   "Qualifications",
  nice_to_have:     "Nice to Have",
};

// Short hints rendered below each field's label in the form.
export const SECTION_HINTS: Record<SectionKey, string> = {
  responsibilities: "o que o dev faz no dia a dia",
  technical_stack:  "linguagens, frameworks, infraestrutura",
  requirements:     "obrigatórios para a vaga",
  qualifications:   "experiência, formação, soft-skills",
  nice_to_have:     "diferenciais — bom de ter, mas não obrigatórios",
};
