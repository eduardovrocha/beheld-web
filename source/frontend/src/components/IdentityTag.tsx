/**
 * Identity tag — surfaces the GitHub identity binding from a bundle's
 * attestation (Phase 5 / F5.6.1.f). Honors the doc principle: never
 * collapses verification into a single "trusted" label. Each piece of
 * the check is listed alongside its outcome.
 *
 * Mirrors the CLI verify output (packages/cli/src/commands/verify.ts):
 *   - github: login (id=…)
 *   - platform signature
 *   - dev pubkey bind
 *   - platform key status (active / rotated / revoked / unknown)
 */
import { useT } from "@/i18n/I18nProvider";
import type { AttestationCheck } from "@/lib/attestationVerify";

interface Props {
  attestation: AttestationCheck | null;
  /** When true, render a slim "checking" placeholder. */
  loading?: boolean;
}

export function IdentityTag({ attestation, loading }: Props) {
  const t = useT();

  if (loading || !attestation) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/40 px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("identity.label")}
        </div>
        <div className="mt-1 h-4 w-40 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/60" />
      </div>
    );
  }

  if (!attestation.present) {
    return (
      <Card tone="muted">
        <Header label={t("identity.label")} tone="muted" />
        <Detail>{t("identity.absent")}</Detail>
      </Card>
    );
  }

  if (!attestation.payload_valid) {
    return (
      <Card tone="bad">
        <Header label={t("identity.label")} tone="bad" />
        <Detail>{t("identity.payload_invalid")}</Detail>
        {attestation.reason ? <Reason text={attestation.reason} /> : null}
      </Card>
    );
  }

  const status = attestation.key_status ?? "unknown";
  const sigOk = attestation.signature_valid;
  const bindOk = !!attestation.dev_pubkey_matches;
  const keyOk = status === "active";
  const fullyOk = sigOk && bindOk && keyOk;

  return (
    <Card tone={fullyOk ? "good" : status === "revoked" ? "bad" : "warn"}>
      <Header label={t("identity.label")} tone={fullyOk ? "good" : status === "revoked" ? "bad" : "warn"} />
      {attestation.github ? (
        <Detail>
          <span className="font-medium">github:</span>{" "}
          <a
            className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
            href={`https://github.com/${attestation.github.login}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {attestation.github.login}
          </a>{" "}
          <span className="text-slate-500 dark:text-slate-400">
            (id={attestation.github.user_id})
          </span>
        </Detail>
      ) : null}

      <ul className="mt-2 space-y-1 text-sm">
        <Sub ok={sigOk} label={t("identity.sub.signature")} />
        <Sub ok={bindOk} label={t("identity.sub.bind")} />
        <Sub
          ok={keyOk}
          warn={status === "rotated" || status === "unknown"}
          label={`${t("identity.sub.key_status")}: ${t(`identity.key_status.${status}`)}`}
        />
      </ul>

      {status === "revoked" && attestation.revoked_reason ? (
        <Reason text={attestation.revoked_reason} />
      ) : null}
    </Card>
  );
}

// ── primitives ───────────────────────────────────────────────────────────────

type Tone = "good" | "warn" | "bad" | "muted";

function toneClasses(tone: Tone): string {
  switch (tone) {
    case "good":
      return "border-emerald-200 dark:border-emerald-700/40 bg-emerald-50/60 dark:bg-emerald-950/20";
    case "warn":
      return "border-amber-200 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-950/20";
    case "bad":
      return "border-rose-200 dark:border-rose-700/40 bg-rose-50/60 dark:bg-rose-950/20";
    case "muted":
      return "border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/40";
  }
}

function Card({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <div className={`rounded-xl border px-4 py-3 ${toneClasses(tone)}`}>{children}</div>;
}

function Header({ label, tone }: { label: string; tone: Tone }) {
  const dot =
    tone === "good" ? "bg-emerald-500"
    : tone === "warn" ? "bg-amber-500"
    : tone === "bad" ? "bg-rose-500"
    : "bg-slate-400";
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
        {label}
      </span>
    </div>
  );
}

function Detail({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{children}</div>;
}

function Sub({ ok, warn, label }: { ok: boolean; warn?: boolean; label: string }) {
  const mark = ok ? "✓" : warn ? "~" : "✗";
  const color = ok
    ? "text-emerald-600 dark:text-emerald-400"
    : warn
    ? "text-amber-600 dark:text-amber-400"
    : "text-rose-600 dark:text-rose-400";
  return (
    <li className="flex items-center gap-2">
      <span className={`font-mono ${color}`}>{mark}</span>
      <span className="text-slate-700 dark:text-slate-200">{label}</span>
    </li>
  );
}

function Reason({ text }: { text: string }) {
  return (
    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{text}</div>
  );
}
