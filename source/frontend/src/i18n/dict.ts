/**
 * Translation dictionaries — Portuguese (default), English, Spanish.
 *
 * Keys are namespaced by surface (nav.*, profile.*, verify.*, home.*).
 * Strings may contain {placeholder} tokens replaced at format time.
 *
 * Technical markers (SHA256 / ED25519 / PUB_KEY / SIG_MATCH:OK / L1: / L2: /
 * crypto.subtle / Bash → Read) are intentionally NOT translated — they're
 * universal field names and system status codes.
 */

export type Locale = "pt" | "en" | "es";

export const LOCALES: Locale[] = ["pt", "en", "es"];
export const LOCALE_LABELS: Record<Locale, string> = {
  pt: "PT",
  en: "EN",
  es: "ES",
};
export const LOCALE_NAMES: Record<Locale, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
};

type Dict = Record<string, string>;

const pt: Dict = {
  // Layout
  "nav.verify_bundle": "Verificar bundle",
  "nav.github": "GitHub",
  "footer.tagline": "devprofile · privacy-first developer profiling · signed snapshots",

  // ThemeToggle
  "theme.auto": "auto",
  "theme.light": "claro",
  "theme.dark": "escuro",
  "theme.aria": "Alternar tema (auto / claro / escuro)",

  // LocaleToggle
  "locale.aria": "Alternar idioma",

  // Home
  "home.title": "Perfis técnicos verificáveis para desenvolvedores",
  "home.subtitle_html":
    "DevProfile é um daemon local que monta um perfil técnico do seu trabalho com Claude Code e Continue.dev. Gera <strong>snapshots assinados</strong> em Ed25519 que qualquer pessoa pode verificar no navegador.",
  "home.cta_install": "Instalar",
  "home.cta_verify": "Verificar bundle",
  "home.features_label": "Recursos",
  "home.code.title": "Como verificar",

  // ProfileCard — header
  "profile.title": "DevProfile",
  "profile.id_prefix": "ID:",
  "profile.pill.idle": "ED25519 PROFILE",
  "profile.pill.ok": "ED25519 VERIFIED PROFILE",
  "profile.pill.fail": "ED25519 — SIGNATURE FAILED",
  "profile.overall_score": "Overall Score",

  // ProfileCard — stats grid
  "profile.stats.prompt": "Prompt Q.",
  "profile.stats.test": "Test Mat.",
  "profile.stats.breadth": "Breadth",
  "profile.stats.growth": "Growth",
  "profile.stats.sessions": "Sessions",

  "profile.stats.prompt.title":   "Prompt Quality",
  "profile.stats.test.title":     "Test Maturity",
  "profile.stats.breadth.title":  "Tech Breadth",
  "profile.stats.growth.title":   "Growth Rate",
  "profile.stats.sessions.title": "Sessions Analyzed",
  "profile.stats.prompt.desc":
    "Qualidade dos prompts: comprimento médio, contexto de código, variedade de tools usadas e duração das sessões produtivas.",
  "profile.stats.test.desc":
    "Maturidade em testes: sessões com contexto de teste, padrões TDD e arquivos/comandos de teste — combinado com a baseline histórica do L1.",
  "profile.stats.breadth.desc":
    "Amplitude técnica: diversidade de ecossistemas, plataformas e linguagens. Combina histórico git (L1, 60%) com sessões recentes (L2, 40%).",
  "profile.stats.growth.desc":
    "Trajetória de evolução: novos ecossistemas adotados e mudança no ratio de testes contra a baseline L1 — fallback para 30 dias quando L1 não existe.",
  "profile.stats.sessions.desc":
    "Sessões do Claude Code consideradas no cálculo dos scores. Janela típica: últimos 30 dias.",

  // ProfileCard — trend
  "profile.trend.title": "12-Month Score Trajectory",
  "profile.trend.subtitle_html":
    "Snapshots reconstruídos a partir da cadeia assinada via <code>previous_hash</code>.",
  "profile.trend.unavailable_html":
    "Trajetória requer múltiplos snapshots na cadeia — disponível em <code>/v/:id</code> servido pelo Rails.",

  // ProfileCard — L1
  "profile.l1.title": "Git History Analysis",
  "profile.l1.repos": "Total Repositories",
  "profile.l1.commits": "Total Commits",
  "profile.l1.activity_window": "Activity Window",
  "profile.l1.avg_test_ratio": "Average Test Ratio",
  "profile.l1.last_commit": "Last Commit",
  "profile.l1.primary_ecosystems": "Primary Ecosystems",
  "profile.l1.platforms": "Platforms",
  "profile.l1.empty.badge": "Bootstrap não realizado",
  "profile.l1.empty.hint_html":
    "Execute <code>devprofile import &lt;url&gt;</code> para popular a base histórica.",
  "profile.l1.repos.desc":
    "Número de repositórios git importados via devprofile import. Cada repo contribui uma única vez para a baseline histórica.",
  "profile.l1.commits.desc":
    "Soma dos commits feitos por você (filtrados pelo seu email de git) entre os repositórios importados.",
  "profile.l1.activity_window.desc":
    "Janela temporal entre o seu primeiro e último commit nos repositórios importados — proxy de há quanto tempo você programa profissionalmente.",
  "profile.l1.avg_test_ratio.desc":
    "Proporção média de arquivos de teste vs arquivos de produção entre os repositórios. Mede disciplina histórica de testes.",
  "profile.l1.avg_test_ratio.scale_title": "Escala de referência",
  "common.scale.low": "baixo",
  "common.scale.average": "médio",
  "common.scale.good": "bom",
  "common.scale.excellent": "excelente",
  "profile.l1.last_commit.desc":
    "Dias desde o seu commit mais recente entre os repositórios importados.",

  // ProfileCard — L2
  "profile.l2.title": "Agentic Workflow Metrics",
  "profile.l2.sessions_analyzed": "Sessions Analyzed",
  "profile.l2.period": "Period",
  "profile.l2.test_after_ratio": "Test-after Ratio",
  "profile.l2.bash_to_read": "Bash → Read",
  "profile.l2.avg_session_duration": "Avg Session Duration",
  "profile.l2.tool_variety": "Tool Variety (avg)",
  "profile.l2.workflow_distribution": "Workflow Distribution",
  "profile.l2.ecosystems_top": "Ecosystems (top)",
  "profile.l2.platforms_top": "Platforms (top)",
  "profile.l2.empty.badge": "L1_ONLY Profile",
  "profile.l2.empty.hint":
    "Sem telemetria de sessão do Claude Code submetida. Sinais de workflow limitados ao histórico git.",
  "profile.l2.sessions_analyzed.desc":
    "Sessões do Claude Code consideradas no cálculo dos scores L2.",
  "profile.l2.period.desc":
    "Janela temporal das sessões consideradas — tipicamente os últimos 30 dias.",
  "profile.l2.test_after_ratio.desc":
    "Fração de sessões em que comandos de teste foram executados DEPOIS de edições de código. Indica padrão test-after (vs TDD test-first).",
  "profile.l2.bash_to_read.desc":
    "Razão entre chamadas de Bash e Read nas sessões. Valores altos sugerem fluxo de descoberta/debug; baixos sugerem revisão guiada por leitura.",
  "profile.l2.avg_session_duration.desc":
    "Duração média de uma sessão de Claude Code, em minutos.",
  "profile.l2.tool_variety.desc":
    "Número médio de tools distintas usadas por sessão. Variedade alta sugere uso amplo das capacidades do agente.",

  // ProfileCard — proof footer
  "profile.proof.title": "Proof of Authenticity (v{version}.0)",
  "profile.proof.copy": "copy",
  "profile.proof.copied": "copied",
  "profile.proof.copy_aria": "Copiar {field}",
  "profile.proof.copied_aria": "{field} copiado",
  "profile.proof.sha256.desc": "Hash SHA-256 do payload canônico — identifica o snapshot de forma única.",
  "profile.proof.ed25519.desc": "Assinatura Ed25519 sobre o hash, gerada pela chave privada do autor.",
  "profile.proof.pubkey.desc": "Chave pública embutida no bundle, usada para verificar a assinatura no navegador.",

  // Common units / formatters
  "common.today": "hoje",
  "common.one_day_ago": "1d atrás",
  "common.days_ago": "{days}d atrás",
  "common.days": "dias",
  "common.min": "min",
  "common.dash": "—",
  "common.period_days": "{days} dias",
  "common.duration_min": "{min} min",

  // VerifyLocal
  "verify.local.title_html":
    "Verificar um <code>.dpbundle</code> offline",
  "verify.local.subtitle_html":
    "Arraste um arquivo aqui ou selecione. Toda a verificação roda <span>no seu navegador</span> via <code>crypto.subtle</code> — nada sai da máquina.",
  "verify.local.drop.idle": "Arraste o .dpbundle ou clique para selecionar",
  "verify.local.drop.drag": "Solte para verificar",
  "verify.local.drop.hint_html":
    "Esperando JSON com campos <code>version</code>, <code>payload</code>, <code>hash</code>, <code>signature</code>, <code>public_key</code>.",
  "verify.local.file_label": "Arquivo:",
  "verify.local.error.title": "Não foi possível parsear o arquivo",

  // VerifyPublic
  "verify.public.error.title": "Não foi possível carregar o bundle",
  "verify.public.error.id_missing": "Bundle id ausente.",
};

const en: Dict = {
  "nav.verify_bundle": "Verify bundle",
  "nav.github": "GitHub",
  "footer.tagline": "devprofile · privacy-first developer profiling · signed snapshots",

  "theme.auto": "auto",
  "theme.light": "light",
  "theme.dark": "dark",
  "theme.aria": "Toggle theme (auto / light / dark)",

  "locale.aria": "Switch language",

  "home.title": "Verifiable technical profiles for developers",
  "home.subtitle_html":
    "DevProfile is a local daemon that builds a technical profile from your Claude Code and Continue.dev work. Produces <strong>Ed25519-signed snapshots</strong> that anyone can verify in the browser.",
  "home.cta_install": "Install",
  "home.cta_verify": "Verify bundle",
  "home.features_label": "Features",
  "home.code.title": "How to verify",

  "profile.title": "DevProfile",
  "profile.id_prefix": "ID:",
  "profile.pill.idle": "ED25519 PROFILE",
  "profile.pill.ok": "ED25519 VERIFIED PROFILE",
  "profile.pill.fail": "ED25519 — SIGNATURE FAILED",
  "profile.overall_score": "Overall Score",

  "profile.stats.prompt": "Prompt Q.",
  "profile.stats.test": "Test Mat.",
  "profile.stats.breadth": "Breadth",
  "profile.stats.growth": "Growth",
  "profile.stats.sessions": "Sessions",

  "profile.stats.prompt.title":   "Prompt Quality",
  "profile.stats.test.title":     "Test Maturity",
  "profile.stats.breadth.title":  "Tech Breadth",
  "profile.stats.growth.title":   "Growth Rate",
  "profile.stats.sessions.title": "Sessions Analyzed",
  "profile.stats.prompt.desc":
    "Prompt quality: average length, code context, tool variety, and productive session duration.",
  "profile.stats.test.desc":
    "Test maturity: sessions with test context, TDD patterns, and test files/commands — combined with the L1 historical baseline.",
  "profile.stats.breadth.desc":
    "Tech breadth: diversity of ecosystems, platforms, and languages. Combines git history (L1, 60%) with recent sessions (L2, 40%).",
  "profile.stats.growth.desc":
    "Growth trajectory: new ecosystems adopted and test-ratio change vs the L1 baseline — falls back to 30 days when L1 is absent.",
  "profile.stats.sessions.desc":
    "Claude Code sessions considered in the score computation. Typical window: last 30 days.",

  "profile.trend.title": "12-Month Score Trajectory",
  "profile.trend.subtitle_html":
    "Snapshots reconstructed from the signed payload chain via <code>previous_hash</code>.",
  "profile.trend.unavailable_html":
    "Trajectory requires multiple snapshots in the chain — available at <code>/v/:id</code> served by Rails.",

  "profile.l1.title": "Git History Analysis",
  "profile.l1.repos": "Total Repositories",
  "profile.l1.commits": "Total Commits",
  "profile.l1.activity_window": "Activity Window",
  "profile.l1.avg_test_ratio": "Average Test Ratio",
  "profile.l1.last_commit": "Last Commit",
  "profile.l1.primary_ecosystems": "Primary Ecosystems",
  "profile.l1.platforms": "Platforms",
  "profile.l1.empty.badge": "Bootstrap not performed",
  "profile.l1.empty.hint_html":
    "Run <code>devprofile import &lt;url&gt;</code> to populate the historical baseline.",
  "profile.l1.repos.desc":
    "Number of git repositories imported via devprofile import. Each repo contributes once to the historical baseline.",
  "profile.l1.commits.desc":
    "Sum of commits authored by you (filtered by your git email) across the imported repositories.",
  "profile.l1.activity_window.desc":
    "Time span between your earliest and latest commit across imported repositories — a proxy for how long you've been programming professionally.",
  "profile.l1.avg_test_ratio.desc":
    "Average ratio of test files to production files across the repositories. Measures historical testing discipline.",
  "profile.l1.avg_test_ratio.scale_title": "Reference scale",
  "common.scale.low": "low",
  "common.scale.average": "average",
  "common.scale.good": "good",
  "common.scale.excellent": "excellent",
  "profile.l1.last_commit.desc":
    "Days since your most recent commit across the imported repositories.",

  "profile.l2.title": "Agentic Workflow Metrics",
  "profile.l2.sessions_analyzed": "Sessions Analyzed",
  "profile.l2.period": "Period",
  "profile.l2.test_after_ratio": "Test-after Ratio",
  "profile.l2.bash_to_read": "Bash → Read",
  "profile.l2.avg_session_duration": "Avg Session Duration",
  "profile.l2.tool_variety": "Tool Variety (avg)",
  "profile.l2.workflow_distribution": "Workflow Distribution",
  "profile.l2.ecosystems_top": "Ecosystems (top)",
  "profile.l2.platforms_top": "Platforms (top)",
  "profile.l2.empty.badge": "L1_ONLY Profile",
  "profile.l2.empty.hint":
    "No Claude Code session telemetry submitted. Workflow signals are limited to git history.",
  "profile.l2.sessions_analyzed.desc":
    "Claude Code sessions considered when computing the L2 scores.",
  "profile.l2.period.desc":
    "Time window of sessions considered — typically the last 30 days.",
  "profile.l2.test_after_ratio.desc":
    "Fraction of sessions where test commands ran AFTER code edits. Signals a test-after pattern (vs TDD's test-first).",
  "profile.l2.bash_to_read.desc":
    "Ratio of Bash invocations to Read invocations in sessions. High values suggest discovery/debug flow; low values suggest reading-first review.",
  "profile.l2.avg_session_duration.desc":
    "Average duration of a Claude Code session, in minutes.",
  "profile.l2.tool_variety.desc":
    "Average number of distinct tools used per session. High variety suggests broad use of the agent's capabilities.",

  "profile.proof.title": "Proof of Authenticity (v{version}.0)",
  "profile.proof.copy": "copy",
  "profile.proof.copied": "copied",
  "profile.proof.copy_aria": "Copy {field}",
  "profile.proof.copied_aria": "{field} copied",
  "profile.proof.sha256.desc": "SHA-256 hash of the canonical payload — uniquely identifies the snapshot.",
  "profile.proof.ed25519.desc": "Ed25519 signature over the hash, produced by the author's private key.",
  "profile.proof.pubkey.desc": "Public key embedded in the bundle, used to verify the signature in the browser.",

  "common.today": "today",
  "common.one_day_ago": "1d ago",
  "common.days_ago": "{days}d ago",
  "common.days": "days",
  "common.min": "min",
  "common.dash": "—",
  "common.period_days": "{days} days",
  "common.duration_min": "{min} min",

  "verify.local.title_html":
    "Verify a <code>.dpbundle</code> offline",
  "verify.local.subtitle_html":
    "Drag a file here or select one. All verification runs <span>in your browser</span> via <code>crypto.subtle</code> — nothing leaves your machine.",
  "verify.local.drop.idle": "Drag the .dpbundle here or click to pick a file",
  "verify.local.drop.drag": "Drop to verify",
  "verify.local.drop.hint_html":
    "Expecting JSON with <code>version</code>, <code>payload</code>, <code>hash</code>, <code>signature</code>, <code>public_key</code>.",
  "verify.local.file_label": "File:",
  "verify.local.error.title": "Could not parse the file",

  "verify.public.error.title": "Could not load the bundle",
  "verify.public.error.id_missing": "Bundle id missing.",
};

const es: Dict = {
  "nav.verify_bundle": "Verificar bundle",
  "nav.github": "GitHub",
  "footer.tagline": "devprofile · perfilado de desarrolladores con privacidad · snapshots firmados",

  "theme.auto": "auto",
  "theme.light": "claro",
  "theme.dark": "oscuro",
  "theme.aria": "Alternar tema (auto / claro / oscuro)",

  "locale.aria": "Cambiar idioma",

  "home.title": "Perfiles técnicos verificables para desarrolladores",
  "home.subtitle_html":
    "DevProfile es un daemon local que construye un perfil técnico de tu trabajo con Claude Code y Continue.dev. Genera <strong>snapshots firmados con Ed25519</strong> que cualquiera puede verificar en el navegador.",
  "home.cta_install": "Instalar",
  "home.cta_verify": "Verificar bundle",
  "home.features_label": "Características",
  "home.code.title": "Cómo verificar",

  "profile.title": "DevProfile",
  "profile.id_prefix": "ID:",
  "profile.pill.idle": "ED25519 PROFILE",
  "profile.pill.ok": "ED25519 VERIFIED PROFILE",
  "profile.pill.fail": "ED25519 — SIGNATURE FAILED",
  "profile.overall_score": "Overall Score",

  "profile.stats.prompt": "Prompt Q.",
  "profile.stats.test": "Test Mat.",
  "profile.stats.breadth": "Breadth",
  "profile.stats.growth": "Growth",
  "profile.stats.sessions": "Sessions",

  "profile.stats.prompt.title":   "Prompt Quality",
  "profile.stats.test.title":     "Test Maturity",
  "profile.stats.breadth.title":  "Tech Breadth",
  "profile.stats.growth.title":   "Growth Rate",
  "profile.stats.sessions.title": "Sessions Analyzed",
  "profile.stats.prompt.desc":
    "Calidad de los prompts: longitud media, contexto de código, variedad de tools y duración de sesiones productivas.",
  "profile.stats.test.desc":
    "Madurez en tests: sesiones con contexto de test, patrones TDD y archivos/comandos de test — combinado con la baseline histórica del L1.",
  "profile.stats.breadth.desc":
    "Amplitud técnica: diversidad de ecosistemas, plataformas y lenguajes. Combina historial git (L1, 60%) con sesiones recientes (L2, 40%).",
  "profile.stats.growth.desc":
    "Trayectoria de evolución: nuevos ecosistemas adoptados y cambio en la ratio de tests contra la baseline L1 — fallback a 30 días sin L1.",
  "profile.stats.sessions.desc":
    "Sesiones de Claude Code consideradas en el cálculo de los scores. Ventana típica: últimos 30 días.",

  "profile.trend.title": "Trayectoria de Score (12 meses)",
  "profile.trend.subtitle_html":
    "Snapshots reconstruidos desde la cadena firmada via <code>previous_hash</code>.",
  "profile.trend.unavailable_html":
    "La trayectoria requiere múltiples snapshots en la cadena — disponible en <code>/v/:id</code> servido por Rails.",

  "profile.l1.title": "Git History Analysis",
  "profile.l1.repos": "Repositorios totales",
  "profile.l1.commits": "Commits totales",
  "profile.l1.activity_window": "Ventana de actividad",
  "profile.l1.avg_test_ratio": "Ratio promedio de tests",
  "profile.l1.last_commit": "Último commit",
  "profile.l1.primary_ecosystems": "Ecosistemas principales",
  "profile.l1.platforms": "Plataformas",
  "profile.l1.empty.badge": "Bootstrap no realizado",
  "profile.l1.empty.hint_html":
    "Ejecuta <code>devprofile import &lt;url&gt;</code> para poblar la base histórica.",
  "profile.l1.repos.desc":
    "Número de repositorios git importados vía devprofile import. Cada repo contribuye una vez a la baseline histórica.",
  "profile.l1.commits.desc":
    "Suma de los commits hechos por ti (filtrados por tu email de git) entre los repositorios importados.",
  "profile.l1.activity_window.desc":
    "Ventana temporal entre tu primer y último commit en los repositorios importados — proxy de hace cuánto programas profesionalmente.",
  "profile.l1.avg_test_ratio.desc":
    "Ratio promedio de archivos de test vs archivos de producción entre los repositorios. Mide disciplina histórica de tests.",
  "profile.l1.avg_test_ratio.scale_title": "Escala de referencia",
  "common.scale.low": "bajo",
  "common.scale.average": "medio",
  "common.scale.good": "bueno",
  "common.scale.excellent": "excelente",
  "profile.l1.last_commit.desc":
    "Días desde tu commit más reciente entre los repositorios importados.",

  "profile.l2.title": "Agentic Workflow Metrics",
  "profile.l2.sessions_analyzed": "Sesiones analizadas",
  "profile.l2.period": "Período",
  "profile.l2.test_after_ratio": "Ratio Test-after",
  "profile.l2.bash_to_read": "Bash → Read",
  "profile.l2.avg_session_duration": "Duración media de sesión",
  "profile.l2.tool_variety": "Variedad de tools (media)",
  "profile.l2.workflow_distribution": "Distribución de workflow",
  "profile.l2.ecosystems_top": "Ecosistemas (top)",
  "profile.l2.platforms_top": "Plataformas (top)",
  "profile.l2.empty.badge": "L1_ONLY Profile",
  "profile.l2.empty.hint":
    "Sin telemetría de sesión de Claude Code enviada. Las señales de workflow se limitan al historial git.",
  "profile.l2.sessions_analyzed.desc":
    "Sesiones de Claude Code consideradas en el cálculo de los scores L2.",
  "profile.l2.period.desc":
    "Ventana temporal de las sesiones consideradas — típicamente los últimos 30 días.",
  "profile.l2.test_after_ratio.desc":
    "Fracción de sesiones donde los comandos de test corrieron DESPUÉS de las ediciones de código. Indica patrón test-after (vs TDD test-first).",
  "profile.l2.bash_to_read.desc":
    "Razón entre llamadas Bash y Read en las sesiones. Valores altos sugieren flujo de descubrimiento/debug; bajos, revisión guiada por lectura.",
  "profile.l2.avg_session_duration.desc":
    "Duración media de una sesión de Claude Code, en minutos.",
  "profile.l2.tool_variety.desc":
    "Número medio de tools distintas usadas por sesión. Variedad alta sugiere uso amplio de las capacidades del agente.",

  "profile.proof.title": "Proof of Authenticity (v{version}.0)",
  "profile.proof.copy": "copiar",
  "profile.proof.copied": "copiado",
  "profile.proof.copy_aria": "Copiar {field}",
  "profile.proof.copied_aria": "{field} copiado",
  "profile.proof.sha256.desc": "Hash SHA-256 del payload canónico — identifica el snapshot de forma única.",
  "profile.proof.ed25519.desc": "Firma Ed25519 sobre el hash, generada por la clave privada del autor.",
  "profile.proof.pubkey.desc": "Clave pública embebida en el bundle, usada para verificar la firma en el navegador.",

  "common.today": "hoy",
  "common.one_day_ago": "hace 1d",
  "common.days_ago": "hace {days}d",
  "common.days": "días",
  "common.min": "min",
  "common.dash": "—",
  "common.period_days": "{days} días",
  "common.duration_min": "{min} min",

  "verify.local.title_html":
    "Verificar un <code>.dpbundle</code> sin conexión",
  "verify.local.subtitle_html":
    "Arrastra un archivo aquí o selecciona uno. Toda la verificación corre <span>en tu navegador</span> via <code>crypto.subtle</code> — nada sale de tu máquina.",
  "verify.local.drop.idle": "Arrastra el .dpbundle aquí o haz clic para elegir",
  "verify.local.drop.drag": "Suelta para verificar",
  "verify.local.drop.hint_html":
    "Esperando JSON con <code>version</code>, <code>payload</code>, <code>hash</code>, <code>signature</code>, <code>public_key</code>.",
  "verify.local.file_label": "Archivo:",
  "verify.local.error.title": "No se pudo procesar el archivo",

  "verify.public.error.title": "No se pudo cargar el bundle",
  "verify.public.error.id_missing": "Falta el id del bundle.",
};

export const DICTIONARIES: Record<Locale, Dict> = { pt, en, es };

/** Replace {placeholder} tokens with the matching value from `params`. */
export function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = params[key];
    return v === undefined || v === null ? "" : String(v);
  });
}
