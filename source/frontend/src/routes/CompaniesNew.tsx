/**
 * /companies/new (alias /empresa/cadastro) — cadastro de empresa,
 * app-shell v2 (design_handoff_cadastro_empresa). Página PÚBLICA no
 * shell `.app--public`, com o SiteNav padrão das páginas públicas
 * (idêntico ao da home: dropdown de empresa + tema + idioma). Renders
 * OUTSIDE <Layout>.
 *
 * A história visual: o stepper de 2 passos (cadastro → email
 * corporativo) logo sob o hero — empresa = chave verificada,
 * igual ao dev. Form enxuto: Empresa + Administrador + Termos.
 *
 * Wiring (handoff "Validação & Submit", adaptado à API real): o backend
 * expõe POST /api/v1/companies aceitando { name, email } (signupCompany)
 * — domínio/cargo/termos são validados client-side (o domínio é checado
 * contra o email: precisa bater; a pré-validação DNS async e o 409 de
 * duplicidade dependem de endpoints que ainda não existem). 422 do
 * servidor mapeia inline; demais erros viram banner âmbar role="alert".
 * Sucesso → estado "email enviado" com o stepper avançado pro passo 02
 * (a tela dedicada de email-confirmation fica fora deste handoff).
 */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { PublicFooter } from "@/components/PublicFooter";
import { SiteNav } from "@/components/SiteNav";
import { ShellButton } from "@/components/app/PageHeader";
import { VerificationStepper, type StepDef } from "@/components/company/VerificationStepper";
import { useT } from "@/i18n/I18nProvider";
import { signupCompany } from "@/lib/companyApi";

import "@/styles/app-shell.css";
import "@/styles/app-profile.css";   /* .app--public + .app__top__r */
import "@/styles/app-signup.css";

// Hostname DNS válido, sem esquema nem path (ex.: nimbustech.com).
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Phase = "form" | "sending" | "sent";

type FieldKey = "company" | "domain" | "adminName" | "email" | "terms";

export function CompaniesNew() {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("form");
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState("");
  const [adminName, setAdminName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("app-v2-page");
    return () => document.documentElement.classList.remove("app-v2-page");
  }, []);

  // Página privada-de-task: title próprio + noindex (handoff §SEO).
  useEffect(() => {
    const prevTitle = document.title;
    document.title = t("csignup.doc_title");
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => { document.title = prevTitle; robots.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanDomain = domain.trim().toLowerCase();
  const emailPlaceholder = `voce@${DOMAIN_RE.test(cleanDomain) ? cleanDomain : "nimbustech.com"}`;

  function validate(): Partial<Record<FieldKey, string>> {
    const errs: Partial<Record<FieldKey, string>> = {};
    const name = company.trim();
    if (name.length < 2 || name.length > 80) errs.company = t("csignup.err.company");
    if (!DOMAIN_RE.test(cleanDomain) || /^https?:\/\//i.test(domain.trim())) {
      errs.domain = t("csignup.err.domain");
    }
    const admin = adminName.trim();
    if (admin.length < 2 || admin.length > 80) errs.adminName = t("csignup.err.admin_name");
    const mail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(mail)) errs.email = t("csignup.err.email");
    else if (!errs.domain && !mail.endsWith(`@${cleanDomain}`)) {
      errs.email = t("csignup.err.email_domain", { domain: cleanDomain });
    }
    if (!terms) errs.terms = t("csignup.err.terms");
    return errs;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBanner(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPhase("sending");
    const result = await signupCompany({ name: company.trim(), email: email.trim() });

    if (result.ok) {
      setSentTo(result.email);
      setPhase("sent");
      return;
    }
    if ("errors" in result) {
      // 422 — mapeia chaves do servidor pros campos da tela.
      setErrors({
        ...(result.errors.name?.[0] ? { company: result.errors.name[0] } : {}),
        ...(result.errors.email?.[0] ? { email: result.errors.email[0] } : {}),
      });
    } else {
      setBanner(result.message || t("csignup.err.generic"));
    }
    setPhase("form");
  }

  const steps: StepDef[] = useMemo(() => [
    { label: t("csignup.step.label", { n: "01" }), title: t("csignup.step1.title"), when: t("csignup.step1.when") },
    { label: t("csignup.step.label", { n: "02" }), title: t("csignup.step2.title"), when: t("csignup.step2.when") },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t]);

  return (
    <div className="app-v2 app--public">
      <a className="skip-link" href="#main">{t("landing.a11y.skip")}</a>
      {/* Nav idêntica à da home (SiteNav): o acesso ao login já vive no
          dropdown "Para empresas" → Entrar, então não passamos extraRight. */}
      <SiteNav />
      <main className="app__main" id="main">
        <div className="wrap-inner">
          <header className="signup-hero">
            <div>
              <p className="eb">
                <span>empresa</span>
                <span className="sl">/</span>
                <span className="you">{t("csignup.eb")}</span>
              </p>
              <h1>{t("csignup.h1")}</h1>
              <p className="sub">
                {t("csignup.sub_prefix")}<b>{t("csignup.sub_verified")}</b>{t("csignup.sub_suffix")}
              </p>
            </div>
            <p className="meta-r">
              <b>1</b> {t("csignup.meta_step")}<br />
              {t("csignup.meta_no_hidden")}
            </p>
          </header>

          <VerificationStepper steps={steps}
                               current={phase === "sent" ? 2 : 1}
                               ariaLabel={t("csignup.stepper_aria")} />

          {phase === "sent" ? (
            <SentPanel email={sentTo} />
          ) : (
            <div className="signup-cols">
              <form className="signup-form" onSubmit={handleSubmit} noValidate>
                {banner && <div className="signup-alert" role="alert">{banner}</div>}

                <FormSection n="01" title={t("csignup.sec1.title")}>
                  <Field id="company" full
                         label={t("csignup.f.company")}
                         error={errors.company}>
                    <input id="company" className="input" type="text" value={company}
                           placeholder="Nimbus Tech" autoComplete="organization"
                           aria-invalid={errors.company ? true : undefined}
                           aria-describedby={errors.company ? "company-err" : undefined}
                           disabled={phase === "sending"}
                           onChange={(e) => setCompany(e.target.value)} />
                  </Field>
                  <Field id="domain" full
                         label={t("csignup.f.domain")}
                         error={errors.domain}
                         hint={!errors.domain && (
                           <>{t("csignup.f.domain_hint_prefix")}<code>TXT</code>{t("csignup.f.domain_hint_suffix")}</>
                         )}>
                    <span className="input-wrap">
                      <span className="prefix" aria-hidden="true">https://</span>
                      <input id="domain" className="input input--prefixed" type="text" value={domain}
                             placeholder="nimbustech.com" autoComplete="url" spellCheck={false}
                             aria-invalid={errors.domain ? true : undefined}
                             aria-describedby={errors.domain ? "domain-err" : "domain-hint"}
                             disabled={phase === "sending"}
                             onChange={(e) => setDomain(e.target.value)} />
                    </span>
                  </Field>
                </FormSection>

                <FormSection n="02" title={t("csignup.sec2.title")}>
                  <Field id="admin-name" label={t("csignup.f.admin_name")} error={errors.adminName}>
                    <input id="admin-name" className="input" type="text" value={adminName}
                           placeholder="Maria Souza" autoComplete="name"
                           aria-invalid={errors.adminName ? true : undefined}
                           disabled={phase === "sending"}
                           onChange={(e) => setAdminName(e.target.value)} />
                  </Field>
                  <Field id="role" label={t("csignup.f.role")} optional={t("csignup.f.optional")}>
                    <input id="role" className="input" type="text" value={role}
                           placeholder="Head of Engineering" autoComplete="organization-title"
                           disabled={phase === "sending"}
                           onChange={(e) => setRole(e.target.value)} />
                  </Field>
                  <Field id="email" full
                         label={t("csignup.f.email")}
                         error={errors.email}
                         hint={!errors.email && t("csignup.f.email_hint")}>
                    <input id="email" className="input" type="email" value={email}
                           placeholder={emailPlaceholder} autoComplete="email"
                           aria-invalid={errors.email ? true : undefined}
                           aria-describedby={errors.email ? "email-err" : "email-hint"}
                           disabled={phase === "sending"}
                           onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                </FormSection>

                <FormSection n="03" title={t("csignup.sec3.title")}>
                  <div className={`terms${terms ? " is-checked" : ""}`}
                       onClick={(e) => {
                         // links de Termos/Privacidade navegam sem togglar
                         if ((e.target as HTMLElement).closest("a, input")) return;
                         setTerms((v) => !v);
                       }}>
                    <input type="checkbox" checked={terms}
                           aria-label={t("csignup.terms_aria")}
                           aria-invalid={errors.terms ? true : undefined}
                           onChange={(e) => setTerms(e.target.checked)} />
                    <span className="box" aria-hidden="true">✓</span>
                    <span className="lbl">
                      {t("csignup.terms_prefix")}
                      <Link to="/compromisso">{t("csignup.terms_tos")}</Link>
                      {t("csignup.terms_mid")}
                      <Link to="/compromisso">{t("csignup.terms_privacy")}</Link>
                      {t("csignup.terms_mid2")}
                      <b>{t("csignup.terms_no_sell")}</b>
                      {t("csignup.terms_suffix")}
                    </span>
                  </div>
                  {errors.terms && (
                    <p className="hint err" role="alert" style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--amber)", margin: "8px 0 0" }}>
                      {errors.terms}
                    </p>
                  )}
                </FormSection>

                <div className="signup-foot">
                  <span className="keep">{t("csignup.keep_line")}</span>
                  <span className="actions">
                    <Link to="/" className="btn">← {t("csignup.back")}</Link>
                    <ShellButton primary type="submit" disabled={phase === "sending"} icon={ArrowRight}>
                      {phase === "sending" ? t("auth.sending") : t("csignup.submit")}
                    </ShellButton>
                  </span>
                </div>
              </form>

              <aside className="signup-side">
                <section className="sidecard">
                  <div className="sidecard__h">
                    <h3>{t("csignup.side.title")}</h3>
                    <span className="meta">{t("csignup.side.meta")}</span>
                  </div>
                  <div className="sidelist">
                    <Benefit t1={t("csignup.side.b1.t")} d={t("csignup.side.b1.d")} />
                    <Benefit t1={t("csignup.side.b2.t")} d={t("csignup.side.b2.d")} />
                    <Benefit t1={t("csignup.side.b3.t")}
                             d={<>{t("csignup.side.b3.d_prefix")}<b>{t("csignup.side.b3.d_verified")}</b>{t("csignup.side.b3.d_suffix")}</>} />
                    <Benefit t1={t("csignup.side.b4.t")} d={t("csignup.side.b4.d")} />
                  </div>
                </section>

                <div className="foreverfree" style={{ marginTop: 0 }}>
                  <span className="ic" aria-hidden="true">∞</span>
                  <p>
                    <b>{t("csignup.free.lead")}</b> {t("csignup.free.body")}
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

const ArrowRight = (
  <svg viewBox="0 0 12 12" fill="none" width="12" height="12">
    <path d="M1.5 6h9M6.5 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// ── form primitives ─────────────────────────────────────────────────────────

function FormSection({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="formsec">
      <div className="formsec__h">
        <h2><span className="n">{n}</span>{title}</h2>
      </div>
      <div className="fgrid">{children}</div>
    </section>
  );
}

function Field({ id, label, hint, error, optional, full = false, children }: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`field2${full ? " full" : ""}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="optional">{optional}</span>}
      </label>
      {children}
      {error
        ? <span className="hint err" id={`${id}-err`} role="alert">{error}</span>
        : hint
          ? <span className="hint" id={`${id}-hint`}>{hint}</span>
          : null}
    </div>
  );
}

function Benefit({ t1, d }: { t1: string; d: ReactNode }) {
  return (
    <div className="item">
      <span className="ck" aria-hidden="true">✓</span>
      <div>
        <p className="t">{t1}</p>
        <p className="d">{d}</p>
      </div>
    </div>
  );
}

// ── estado "email enviado" (passo 02 do stepper) ────────────────────────────

function SentPanel({ email }: { email: string }) {
  const t = useT();
  return (
    <div className="signup-cols">
      <section className="signup-form">
        <div className="formsec">
          <div className="formsec__h">
            <h2><span className="n">02</span>{t("auth.verify_email.title")}</h2>
          </div>
          <p style={{ color: "var(--ink-2)", fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>
            {t("auth.verify_email.body_prefix")}
            <strong style={{ color: "var(--signal-ink)" }}>{email}</strong>
            {t("auth.verify_email.body_suffix")}
          </p>
          <p style={{ color: "var(--ink-3)", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
            {t("csignup.sent.next")}
          </p>
        </div>
        <div className="signup-foot">
          <span className="keep">{t("csignup.keep_line")}</span>
          <span className="actions">
            <Link to="/" className="btn">← {t("auth.back_home")}</Link>
          </span>
        </div>
      </section>
    </div>
  );
}
