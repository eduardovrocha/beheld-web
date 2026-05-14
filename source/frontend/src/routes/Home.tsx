import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { siClaude, siCursor, siWindsurf } from "simple-icons";
import type { SimpleIcon } from "simple-icons";
import { useT } from "../i18n/I18nProvider";

function BrandIcon({ icon, size = 28 }: { icon: SimpleIcon; size?: number }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      aria-label={icon.title}
      className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
    >
      <title>{icon.title}</title>
      <path d={icon.path} fill="currentColor" />
    </svg>
  );
}

function TypewriterCycle({
  words,
  typeMs = 70,
  eraseMs = 38,
  pauseFullMs = 1500,
  pauseEmptyMs = 250,
}: {
  words: string[];
  typeMs?: number;
  eraseMs?: number;
  pauseFullMs?: number;
  pauseEmptyMs?: number;
}) {
  const [wi, setWi] = useState(0);
  const [n, setN] = useState(0);
  const [erasing, setErasing] = useState(false);

  useEffect(() => {
    setWi(0);
    setN(0);
    setErasing(false);
  }, [words.join("|")]);

  useEffect(() => {
    if (words.length === 0) return;
    const word = words[wi % words.length];
    let delay: number;
    if (!erasing && n < word.length) {
      delay = typeMs;
    } else if (!erasing && n === word.length) {
      delay = pauseFullMs;
    } else if (erasing && n > 0) {
      delay = eraseMs;
    } else {
      delay = pauseEmptyMs;
    }
    const id = window.setTimeout(() => {
      if (!erasing && n < word.length) {
        setN(n + 1);
      } else if (!erasing && n === word.length) {
        setErasing(true);
      } else if (erasing && n > 0) {
        setN(n - 1);
      } else {
        setErasing(false);
        setWi((wi + 1) % words.length);
      }
    }, delay);
    return () => window.clearTimeout(id);
  }, [wi, n, erasing, words, typeMs, eraseMs, pauseFullMs, pauseEmptyMs]);

  const current = words[wi % words.length] ?? "";
  return (
    <span>
      <span className="text-emerald-600 dark:text-emerald-400">
        {current.slice(0, n)}
      </span>
      <span className="terminal-cursor align-baseline" aria-hidden="true" />
    </span>
  );
}

const INSTALL_CMD = "curl -fsSL install.devprofile.info | sh";
const GITHUB_URL = "https://github.com/eduardovrocha/devprofile";
const HIRER_EARLY_ACCESS_URL =
  "mailto:contato@devprofile.app?subject=Acesso%20antecipado%20%E2%80%94%20empresa";

type Bar = { label: string; score: number; tone: "emerald" | "amber" | "red" };

const HERO_BARS: Bar[] = [
  { label: "Prompt Quality", score: 84, tone: "emerald" },
  { label: "Test Maturity", score: 62, tone: "amber" },
  { label: "Tech Breadth", score: 91, tone: "emerald" },
  { label: "Growth Rate", score: 75, tone: "emerald" },
];
const OVERALL = Math.round(
  HERO_BARS.reduce((acc, b) => acc + b.score, 0) / HERO_BARS.length,
);

function toneFill(tone: Bar["tone"]) {
  switch (tone) {
    case "emerald":
      return "bg-emerald-500 dark:bg-emerald-400";
    case "amber":
      return "bg-amber-500 dark:bg-amber-400";
    case "red":
      return "bg-red-500 dark:bg-red-400";
  }
}

function BarRow({
  label,
  score,
  tone,
  bold = false,
  delta,
}: {
  label: string;
  score: number;
  tone: Bar["tone"];
  bold?: boolean;
  delta?: string;
}) {
  return (
    <div className="flex items-center gap-3 w-full">
      <span
        className={`shrink-0 w-32 sm:w-36 ${
          bold
            ? "font-semibold text-slate-800 dark:text-slate-200"
            : "text-slate-700 dark:text-slate-300"
        }`}
      >
        {label}
      </span>
      <div className="flex-1 h-3 bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full ${toneFill(tone)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span
        className={`shrink-0 w-8 text-right tabular-nums ${
          bold
            ? "font-semibold text-slate-800 dark:text-slate-200"
            : "text-slate-700 dark:text-slate-300"
        }`}
      >
        {score}
      </span>
      {delta ? (
        <span className="shrink-0 text-emerald-500 dark:text-emerald-400 whitespace-nowrap">
          {delta}
        </span>
      ) : null}
    </div>
  );
}

function TerminalHero({ caption }: { caption: string }) {
  const rows: React.ReactNode[] = [];
  rows.push(
    <>
      <span className="text-slate-500 dark:text-slate-500">$ </span>
      <span className="text-slate-800 dark:text-slate-200">devprofile view</span>{" "}
      <span className="text-slate-500 dark:text-slate-500">--scores-only</span>
    </>,
  );
  HERO_BARS.forEach((b) =>
    rows.push(<BarRow label={b.label} score={b.score} tone={b.tone} />),
  );
  rows.push(
    <div className="h-px w-full bg-slate-200 dark:bg-slate-800 my-1" />,
  );
  rows.push(
    <BarRow
      label="Overall"
      score={OVERALL}
      tone="emerald"
      bold
      delta="↑ +3 vs last week"
    />,
  );

  return (
    <figure className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        <span className="ml-3 font-mono text-xs text-slate-500 dark:text-slate-500">
          {caption}
        </span>
      </div>
      <div className="px-5 py-5 font-mono text-[13px] leading-6 sm:text-sm sm:leading-7 space-y-1.5">
        {rows.map((content, i) => (
          <div
            key={i}
            className="terminal-line"
            style={{ ["--d" as never]: `${100 + i * 110}ms` }}
          >
            {content}
          </div>
        ))}
      </div>
    </figure>
  );
}

function InstallBlock({ label, sub }: { label: string; sub: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
      <div className="font-mono text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-500">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <code className="flex-1 truncate font-mono text-sm sm:text-base text-slate-800 dark:text-slate-200">
          <span className="text-slate-400 dark:text-slate-600">$ </span>
          {INSTALL_CMD}
        </code>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy install command"
          className="shrink-0 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500 dark:hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors"
        >
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">{sub}</div>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
      {children}
    </h2>
  );
}

function StepCard({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-6">
      <div className="font-mono text-xs uppercase tracking-wider text-slate-500 dark:text-slate-500">
        {step}
      </div>
      <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {body}
      </p>
    </div>
  );
}

export function Home() {
  const t = useT();

  return (
    <div className="space-y-20 md:space-y-28">
      {/* HERO */}
      <section className="space-y-8">
        <div className="flex items-center justify-between gap-6 w-full">
          <h1 className="font-mono text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            <span className="block">
              {t("land.hero.headline_prefix").trim()}
            </span>
            <span className="block">
              <span className="text-emerald-600 dark:text-emerald-400">$&nbsp;</span>
              <TypewriterCycle
                words={t("land.hero.headline_verbs")
                  .split(",")
                  .map((w) => w.trim())
                  .filter(Boolean)}
              />
            </span>
          </h1>
          <div className="shrink-0 flex items-center gap-4 sm:gap-5">
            <BrandIcon icon={siClaude} />
            <BrandIcon icon={siCursor} />
            <BrandIcon icon={siWindsurf} />
          </div>
        </div>
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-6">
            <p className="max-w-xl text-base md:text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              {t("land.hero.sub")}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:border-slate-400 dark:hover:border-slate-500"
              >
                {t("land.hero.cta_github")}
              </a>
              <a
                href="#para-empresas"
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200"
              >
                {t("land.hero.cta_hirer")}
              </a>
            </div>
          </div>
          <div>
            <TerminalHero caption={t("land.hero.terminal_caption")} />
          </div>
        </div>
        <InstallBlock
          label={t("land.hero.install_label")}
          sub={t("land.hero.install_sub")}
        />
      </section>

      {/* HOW IT WORKS */}
      <section>
        <div className="mb-8">
          <SectionEyebrow>{t("land.how.title")}</SectionEyebrow>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StepCard
            step="01"
            title={t("land.how.step1.title")}
            body={t("land.how.step1.body")}
          />
          <StepCard
            step="02"
            title={t("land.how.step2.title")}
            body={t("land.how.step2.body")}
          />
          <StepCard
            step="03"
            title={t("land.how.step3.title")}
            body={t("land.how.step3.body")}
          />
        </div>
      </section>

      {/* FOR HIRERS */}
      <section
        id="para-empresas"
        className="scroll-mt-24 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-8 md:p-10"
      >
        <SectionEyebrow>{t("land.hire.eyebrow")}</SectionEyebrow>
        <SectionTitle>{t("land.hire.title")}</SectionTitle>
        <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-400">
          {t("land.hire.subtitle")}
        </p>
        <ul className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            t("land.hire.bullet1"),
            t("land.hire.bullet2"),
            t("land.hire.bullet3"),
          ].map((b, i) => (
            <li
              key={i}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4 text-sm text-slate-700 dark:text-slate-300"
            >
              <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                0{i + 1}.
              </span>{" "}
              {b}
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          {t("land.hire.closer")}
        </p>
        <div className="mt-6">
          <a
            href={HIRER_EARLY_ACCESS_URL}
            className="inline-flex items-center rounded-lg bg-emerald-600 dark:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-950 transition-colors hover:bg-emerald-700 dark:hover:bg-emerald-400"
          >
            {t("land.hire.cta")}
          </a>
        </div>
      </section>

      {/* PRIVACY */}
      <section>
        <SectionEyebrow>privacy</SectionEyebrow>
        <SectionTitle>{t("land.priv.title")}</SectionTitle>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-6">
            <div className="font-mono text-xs uppercase tracking-wider text-red-700 dark:text-red-400">
              never collected
            </div>
            <p
              className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
              dangerouslySetInnerHTML={{ __html: t("land.priv.never") }}
            />
          </div>
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-6">
            <div className="font-mono text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              only metadata
            </div>
            <p
              className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
              dangerouslySetInnerHTML={{ __html: t("land.priv.what") }}
            />
          </div>
        </div>
        <p
          className="mt-6 max-w-3xl text-sm text-slate-600 dark:text-slate-400"
          dangerouslySetInnerHTML={{ __html: t("land.priv.closer_html") }}
        />
      </section>

      {/* CRYPTO VERIFICATION */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-8 md:p-10">
        <SectionEyebrow>cryptographic verification</SectionEyebrow>
        <SectionTitle>{t("land.crypto.title")}</SectionTitle>
        <p
          className="mt-4 max-w-3xl text-sm md:text-base leading-relaxed text-slate-600 dark:text-slate-400"
          dangerouslySetInnerHTML={{ __html: t("land.crypto.body_html") }}
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/verify"
            className="rounded-lg bg-emerald-600 dark:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-950 transition-colors hover:bg-emerald-700 dark:hover:bg-emerald-400"
          >
            {t("land.crypto.cta_verify")}
          </Link>
          <a
            href={`${GITHUB_URL}#dpbundle-spec`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:border-slate-400 dark:hover:border-slate-500"
          >
            {t("land.crypto.cta_spec")}
          </a>
        </div>
      </section>
    </div>
  );
}
