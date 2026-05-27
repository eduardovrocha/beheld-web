/**
 * Client-side technology extractor for job-posting markdown.
 *
 * Given the free-text contents of a .md file (description of a vacancy),
 * returns the list of canonical tech names that appear in it. Runs
 * entirely in the browser so the upload never leaves the recruiter's
 * machine until they submit the form — same privacy posture as the rest
 * of beheld.
 *
 * Matching strategy:
 *   - Each entry has a canonical display name + a list of case-insensitive
 *     aliases (regex-safe). The text is normalized to lowercase and
 *     scanned with word-boundary regexes built from the alias list.
 *   - Dedupe by canonical name, preserve first-occurrence order so the
 *     resulting chip list mirrors how the description reads.
 *
 * Extending: just add to TECH_DICTIONARY. Keep aliases lowercase. If an
 * alias contains a character that needs escaping (e.g. C++, C#, .NET),
 * the helper `escapeRegex()` handles it.
 */

type TechEntry = {
  canonical: string;
  aliases:   string[];
};

// The dictionary intentionally biases toward backend / web / cloud /
// data / mobile / AI stacks that show up in beheld signals. Curated; not
// exhaustive — recruiters can always add freeform tags after extraction.
const TECH_DICTIONARY: TechEntry[] = [
  // Languages
  { canonical: "TypeScript",  aliases: ["typescript", "ts"] },
  { canonical: "JavaScript",  aliases: ["javascript", "js", "ecmascript"] },
  { canonical: "Python",      aliases: ["python", "py"] },
  { canonical: "Ruby",        aliases: ["ruby"] },
  { canonical: "Go",          aliases: ["golang"] },     // "go" alone is too noisy; rely on "golang"
  { canonical: "Rust",        aliases: ["rust"] },
  { canonical: "Java",        aliases: ["java"] },
  { canonical: "Kotlin",      aliases: ["kotlin"] },
  { canonical: "Swift",       aliases: ["swift"] },
  { canonical: "PHP",         aliases: ["php"] },
  { canonical: "C++",         aliases: ["c\\+\\+", "cpp"] },
  { canonical: "C#",          aliases: ["c#", "csharp"] },
  { canonical: "Elixir",      aliases: ["elixir"] },
  { canonical: "Scala",       aliases: ["scala"] },
  { canonical: "Clojure",     aliases: ["clojure"] },
  { canonical: "Haskell",     aliases: ["haskell"] },

  // Frontend
  { canonical: "React",       aliases: ["react", "reactjs"] },
  { canonical: "Vue",         aliases: ["vue", "vuejs", "vue\\.js"] },
  { canonical: "Angular",     aliases: ["angular"] },
  { canonical: "Svelte",      aliases: ["svelte", "sveltekit"] },
  { canonical: "Next.js",     aliases: ["next\\.js", "nextjs"] },
  { canonical: "Nuxt",        aliases: ["nuxt", "nuxtjs"] },
  { canonical: "Remix",       aliases: ["remix"] },
  { canonical: "Vite",        aliases: ["vite"] },
  { canonical: "Tailwind",    aliases: ["tailwind", "tailwindcss"] },

  // Backend frameworks
  { canonical: "Rails",       aliases: ["rails", "ruby on rails", "ror"] },
  { canonical: "Django",      aliases: ["django"] },
  { canonical: "Flask",       aliases: ["flask"] },
  { canonical: "FastAPI",     aliases: ["fastapi"] },
  { canonical: "Express",     aliases: ["express", "expressjs"] },
  { canonical: "NestJS",      aliases: ["nestjs", "nest\\.js"] },
  { canonical: "Phoenix",     aliases: ["phoenix"] },
  { canonical: "Spring",      aliases: ["spring", "spring boot"] },
  { canonical: "Laravel",     aliases: ["laravel"] },
  { canonical: ".NET",        aliases: ["\\.net", "dotnet", "asp\\.net"] },

  // Databases
  { canonical: "PostgreSQL",  aliases: ["postgresql", "postgres", "psql"] },
  { canonical: "MySQL",       aliases: ["mysql"] },
  { canonical: "MariaDB",     aliases: ["mariadb"] },
  { canonical: "MongoDB",     aliases: ["mongodb", "mongo"] },
  { canonical: "Redis",       aliases: ["redis"] },
  { canonical: "Elasticsearch", aliases: ["elasticsearch", "elastic search"] },
  { canonical: "DynamoDB",    aliases: ["dynamodb"] },
  { canonical: "Cassandra",   aliases: ["cassandra"] },
  { canonical: "SQLite",      aliases: ["sqlite"] },
  { canonical: "ClickHouse",  aliases: ["clickhouse"] },

  // Cloud / infra
  { canonical: "AWS",         aliases: ["aws", "amazon web services"] },
  { canonical: "GCP",         aliases: ["gcp", "google cloud", "google cloud platform"] },
  { canonical: "Azure",       aliases: ["azure"] },
  { canonical: "Kubernetes",  aliases: ["kubernetes", "k8s"] },
  { canonical: "Docker",      aliases: ["docker"] },
  { canonical: "Terraform",   aliases: ["terraform"] },
  { canonical: "Ansible",     aliases: ["ansible"] },
  { canonical: "Vercel",      aliases: ["vercel"] },
  { canonical: "Netlify",     aliases: ["netlify"] },
  { canonical: "Cloudflare",  aliases: ["cloudflare"] },
  { canonical: "Linux",       aliases: ["linux"] },

  // CI / DevOps
  { canonical: "GitHub Actions", aliases: ["github actions", "gha"] },
  { canonical: "GitLab CI",      aliases: ["gitlab ci"] },
  { canonical: "Jenkins",        aliases: ["jenkins"] },
  { canonical: "CircleCI",       aliases: ["circleci", "circle ci"] },

  // Testing
  { canonical: "Jest",        aliases: ["jest"] },
  { canonical: "Vitest",      aliases: ["vitest"] },
  { canonical: "RSpec",       aliases: ["rspec"] },
  { canonical: "Pytest",      aliases: ["pytest"] },
  { canonical: "Playwright",  aliases: ["playwright"] },
  { canonical: "Cypress",     aliases: ["cypress"] },

  // Mobile
  { canonical: "iOS",          aliases: ["ios"] },
  { canonical: "Android",      aliases: ["android"] },
  { canonical: "React Native", aliases: ["react native"] },
  { canonical: "Flutter",      aliases: ["flutter"] },

  // AI / ML
  { canonical: "TensorFlow",  aliases: ["tensorflow"] },
  { canonical: "PyTorch",     aliases: ["pytorch"] },
  { canonical: "LangChain",   aliases: ["langchain"] },
  { canonical: "OpenAI",      aliases: ["openai"] },
  { canonical: "Anthropic",   aliases: ["anthropic", "claude api"] },

  // Messaging / streaming
  { canonical: "Kafka",       aliases: ["kafka"] },
  { canonical: "RabbitMQ",    aliases: ["rabbitmq"] },
  { canonical: "Sidekiq",     aliases: ["sidekiq"] },
  { canonical: "Celery",      aliases: ["celery"] },

  // Protocols / formats
  { canonical: "GraphQL",     aliases: ["graphql"] },
  { canonical: "gRPC",        aliases: ["grpc"] },
  { canonical: "REST",        aliases: ["rest api", "restful"] },
  { canonical: "WebSocket",   aliases: ["websocket", "web socket"] },

  // Build / tooling
  { canonical: "Bun",         aliases: ["bun"] },
  { canonical: "Node.js",     aliases: ["node\\.js", "nodejs"] },
  { canonical: "Deno",        aliases: ["deno"] },
];

export interface ExtractionResult {
  technologies: string[];   // canonical names, first-occurrence order
  matchCount:   number;     // total raw matches (useful for confidence hints)
}

export function extractTechnologies(markdown: string): ExtractionResult {
  if (!markdown) return { technologies: [], matchCount: 0 };

  // Strip code blocks first so `npm install react` lines don't dominate.
  // We still want to scan them, but separately so the de-dup keeps order
  // intact. Simplest approach: lowercase the whole text and scan once.
  const lower = markdown.toLowerCase();

  // Record (canonical, firstIndex) so we can sort by occurrence position.
  const hits: Array<{ canonical: string; firstIndex: number }> = [];
  let matchCount = 0;

  for (const entry of TECH_DICTIONARY) {
    // Build one regex per entry: \b(alias1|alias2|...)\b. For entries
    // whose tokens include a leading symbol (.NET, C#, C++) the \b on
    // the left would fail — those aliases are already escaped to include
    // the symbol so we relax the left boundary by using (?:^|[^\w]) and
    // a non-capturing trailing boundary.
    const pattern = entry.aliases.join("|");
    // `\b` won't anchor "c#" or "c++" — use a non-word lookaround on the
    // right and a permissive left side that accepts start-of-string or a
    // non-alphanumeric char.
    const re = new RegExp(`(?:^|[^a-z0-9_+#.])(${pattern})(?![a-z0-9_])`, "gi");
    const m  = lower.match(re);
    if (m && m.length > 0) {
      // Find the first position where any alias matches, for ordering.
      const firstIndex = lower.search(new RegExp(`(?:^|[^a-z0-9_+#.])(${pattern})(?![a-z0-9_])`, "i"));
      hits.push({ canonical: entry.canonical, firstIndex: firstIndex < 0 ? Number.MAX_SAFE_INTEGER : firstIndex });
      matchCount += m.length;
    }
  }

  // De-dup by canonical (already unique per entry) and sort by firstIndex
  // so chips render in document order — feels natural when scanning the
  // markdown beside the form.
  hits.sort((a, b) => a.firstIndex - b.firstIndex);
  const seen = new Set<string>();
  const technologies = hits
    .map((h) => h.canonical)
    .filter((c) => {
      if (seen.has(c)) return false;
      seen.add(c);
      return true;
    });

  return { technologies, matchCount };
}

// Read a File object as UTF-8 text. Used by the form's <input type=file>
// handler. Promise-based so the caller can await the result inline.
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("falha ao ler arquivo"));
    reader.readAsText(file, "utf-8");
  });
}

// Convenience helper for callers: take a File, return extracted techs +
// the raw text so they can also drop the description into the form.
export async function extractFromFile(file: File): Promise<{ markdown: string; technologies: string[]; matchCount: number }> {
  const markdown = await readFileAsText(file);
  const { technologies, matchCount } = extractTechnologies(markdown);
  return { markdown, technologies, matchCount };
}
