/**
 * /sessions/company/new (alias /empresa/entrar) — login passwordless da
 * empresa, app-shell v2 (design_handoff_login_empresa). Página PÚBLICA
 * no shell `.app--public`, com o SiteNav padrão das páginas públicas
 * (theme/locale toggles). Renders OUTSIDE <Layout>.
 *
 * State machine: checking → (redirect | idle) → submitting → sent;
 * sent → idle só via reenviar pós-cooldown. Banner âmbar (429/rede) é
 * overlay — NÃO tira o usuário do estado sent.
 *
 * Wiring (adaptado à API real): o submit usa requestCompanyLink →
 * POST /api/v1/sessions/company/request (não existe
 * /api/auth/magic-link/request). SEGURANÇA: o estado "sent" aparece
 * SEMPRE que o pedido foi aceito — inclusive quando o backend responde
 * not_registered — pra nunca vazar quais emails têm conta.
 *
 * Sessão ativa: o stack é uma SPA Vite (sem SSR) — o "redirect antes de
 * renderizar" vira um pre-check no mount (GET autenticado via cookie);
 * NADA é renderizado até o check resolver, então não há flicker do form
 * pra quem já está logado (redirect pra /company/dashboard).
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { SiteNav } from "@/components/SiteNav";
import { ShellButton } from "@/components/app/PageHeader";
import { useT } from "@/i18n/I18nProvider";
import { requestCompanyLink } from "@/lib/companyApi";
import { getDashboard, CompanyAuthError } from "@/lib/companyDashboardApi";

import "@/styles/app-shell.css";
import "@/styles/app-profile.css";   /* .app--public + .app__top__r */
import "@/styles/app-signup.css";    /* .field2 / .input */
import "@/styles/app-login.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SOFT_LIMIT = 3;

/** Tuning exposto pra teste (cooldown real de 60s tornaria o teste do
 *  fluxo de 3 reenvios inviável sem fake timers, que travam o waitFor). */
export const LOGIN_TUNING = { resendCooldownS: 60 };

type Phase = "checking" | "idle" | "submitting" | "sent";

export function CompanyLogin() {
  const t = useT();
  const navigate = useNavigate();
  // Token expirado manda de volta pra cá com ?email= pré-preenchido.
  const [params] = useSearchParams();
  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState(() => params.get("email") ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resends, setResends] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    document.documentElement.classList.add("app-v2-page");
    return () => document.documentElement.classList.remove("app-v2-page");
  }, []);

  // <title> + noindex (handoff §SEO).
  useEffect(() => {
    const prev = document.title;
    document.title = t("clogin.doc_title");
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => { document.title = prev; robots.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sessão ativa? Nada renderiza até resolver — sem flicker do form.
  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then(() => { if (!cancelled) navigate("/company/dashboard", { replace: true }); })
      .catch((e) => {
        if (cancelled) return;
        // 401 (sem sessão) e qualquer falha de rede caem no form — a página
        // é pública; o check é só conveniência pra quem já está logado.
        void (e instanceof CompanyAuthError);
        setPhase("idle");
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearInterval(cooldownTimer.current), []);

  function startCooldown() {
    const total = LOGIN_TUNING.resendCooldownS;
    setCooldown(total);
    clearInterval(cooldownTimer.current);
    if (total <= 0) return;
    cooldownTimer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(cooldownTimer.current); return 0; }
        return s - 1;
      });
    }, 1_000);
  }

  const trimmed = email.trim();
  const valid = EMAIL_RE.test(trimmed);

  async function send(typedEmail: string, { fromResend = false } = {}) {
    setBanner(null);
    setPhase("submitting");
    // Normaliza só o que vai pro servidor; o estado "sent" ecoa o que o
    // usuário digitou (regra do handoff).
    const result = await requestCompanyLink(typedEmail.trim().toLowerCase());

    // SEGURANÇA: not_registered → mesma UX de sucesso. Nunca vazar.
    if (result.ok || result.reason === "not_registered" || result.reason === "missing_email") {
      setSentTo(typedEmail.trim());
      setPhase("sent");
      // cooldown só depois de REENVIAR (handoff §Reenviar) — na chegada
      // ao estado sent o link fica imediatamente disponível.
      if (fromResend) { setResends((n) => n + 1); startCooldown(); }
      return;
    }

    // 429 / 5xx / rede: banner âmbar — sem tirar o usuário do sent.
    setBanner(result.status === 429 ? t("clogin.err.rate_limited") : t("clogin.err.network"));
    setPhase(fromResend || sentTo ? "sent" : "idle");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) { setFieldError(t("clogin.err.email")); return; }
    setFieldError(null);
    void send(email);
  }

  if (phase === "checking") return null;

  const state = phase === "sent" ? "sent" : "idle";

  return (
    <div className="app-v2 app--public">
      <a className="skip-link" href="#main">{t("landing.a11y.skip")}</a>
      <SiteNav />
      <main className="app__main" id="main">
        <div className="login-shell" data-state={state}>
          <header className="login-hero">
            <p className="eb">
              <span>empresa</span>
              <span className="sl">/</span>
              <span className="you">{t("clogin.eb")}</span>
            </p>
            <h1>{t("clogin.h1")}</h1>
          </header>

          {banner && (
            <div className="login-alert" role="alert">
              <span>{banner}</span>
              <button type="button" onClick={() => void send(state === "sent" ? sentTo : email, { fromResend: state === "sent" })}>
                {t("clogin.retry")}
              </button>
            </div>
          )}

          {state === "idle" ? (
            <>
              <LoginCard
                email={email}
                onEmail={(v) => { setEmail(v); if (fieldError) setFieldError(null); }}
                onBlur={() => setFieldError(trimmed.length > 0 && !valid ? t("clogin.err.email") : null)}
                fieldError={fieldError}
                submitting={phase === "submitting"}
                canSubmit={valid && phase !== "submitting"}
                onSubmit={handleSubmit}
              />
              <LoginTrustStrip />
            </>
          ) : (
            <LoginSent
              email={sentTo}
              cooldown={cooldown}
              resends={resends}
              resending={phase === "submitting"}
              onResend={() => void send(sentTo, { fromResend: true })}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ── idle: card + actions ────────────────────────────────────────────────────

function LoginCard({ email, onEmail, onBlur, fieldError, submitting, canSubmit, onSubmit }: {
  email: string;
  onEmail: (v: string) => void;
  onBlur: () => void;
  fieldError: string | null;
  submitting: boolean;
  canSubmit: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const t = useT();
  return (
    <form className="login-card" onSubmit={onSubmit} noValidate aria-busy={submitting || undefined}>
      <div className="field2">
        <label htmlFor="email">
          {t("clogin.f.email")}
          <span className="optional">{t("clogin.f.email_hint")}</span>
        </label>
        <input id="email" className="input" type="email" value={email}
               placeholder="hr@tuempresa.com" autoComplete="email" autoFocus required
               disabled={submitting}
               aria-invalid={fieldError ? true : undefined}
               aria-describedby={fieldError ? "email-err" : undefined}
               onBlur={onBlur}
               onChange={(e) => onEmail(e.target.value)} />
        {fieldError && <span className="hint err" id="email-err" role="alert">{fieldError}</span>}
      </div>

      <div className="login-actions">
        <span className="alt">
          {t("clogin.no_account")}{" "}
          <Link to="/empresa/cadastro">{t("clogin.create_one")}</Link>
        </span>
        <ShellButton primary type="submit" disabled={!canSubmit}
                     icon={submitting ? <span className="spin" aria-hidden="true" /> : ArrowRight}>
          {submitting ? t("clogin.sending") : t("clogin.submit")}
        </ShellButton>
      </div>
    </form>
  );
}

const ArrowRight = (
  <svg viewBox="0 0 12 12" fill="none" width="12" height="12">
    <path d="M1.5 6h9M6.5 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// ── trust strip — o contrato passwordless (só no idle) ─────────────────────

function LoginTrustStrip() {
  const t = useT();
  return (
    <aside className="login-trust">
      <span className="ic" aria-hidden="true">✓</span>
      <p>
        {t("clogin.trust_prefix")}<b>{t("clogin.trust_no_pass")}</b>
        {t("clogin.trust_mid")}<b>{t("clogin.trust_30min")}</b>
        {t("clogin.trust_suffix")}
      </p>
    </aside>
  );
}

// ── sent: confirmação + reenviar com cooldown ───────────────────────────────

function LoginSent({ email, cooldown, resends, resending, onResend }: {
  email: string;
  cooldown: number;
  resends: number;
  resending: boolean;
  onResend: () => void;
}) {
  const t = useT();
  const onCooldown = cooldown > 0;
  return (
    <section className="login-sent" aria-live="polite">
      <span className="ic" aria-hidden="true">✓</span>
      <h2>{t("clogin.sent.title")}</h2>
      <p>
        {t("clogin.sent.body_prefix")}<b>{email}</b>{t("clogin.sent.body_suffix")}
        <br />
        {t("clogin.sent.expires_prefix")}<span className="expira">{t("clogin.sent.expires_min")}</span>{t("clogin.sent.expires_suffix")}
      </p>
      <p className="resend">
        {t("clogin.sent.not_arrived")}{" "}
        <button type="button" disabled={onCooldown || resending} onClick={onResend}>
          {resending
            ? t("clogin.sending")
            : onCooldown
              ? t("clogin.sent.resend_cooldown", { s: cooldown })
              : t("clogin.sent.resend")}
        </button>
        {resends >= RESEND_SOFT_LIMIT && (
          <span className="soft">
            {t("clogin.sent.soft_check")}{" "}
            <Link to="/empresa/cadastro">{t("clogin.sent.soft_signup")}</Link>
          </span>
        )}
      </p>
    </section>
  );
}
