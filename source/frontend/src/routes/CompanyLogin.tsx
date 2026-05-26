/**
 * Recruiter magic-link request (`/sessions/company/new`).
 *
 * Same visual grammar as CompaniesNew: numbered section + white card on
 * cream bg + mono uppercase labels. Two phases: form → "verifique seu
 * email". 404 (email não cadastrado) keeps the form visible and surfaces
 * the error inline so the user can fix and retry.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { requestCompanyLink, type RequestLinkResult } from "@/lib/companyApi";

type Phase = "form" | "sending" | "sent";

export function CompanyLogin() {
  const [phase, setPhase]   = useState<Phase>("form");
  const [email, setEmail]   = useState("");
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [error, setError]   = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPhase("sending");

    const result: RequestLinkResult = await requestCompanyLink(email.trim());

    if (result.ok) {
      setConfirmedEmail(result.email);
      setPhase("sent");
      return;
    }

    setError(
      result.reason === "not_registered" ? "Email não cadastrado." :
      result.reason === "missing_email"  ? "Informe um email."     :
                                          "Não foi possível enviar o link agora. Tente novamente.",
    );
    setPhase("form");
  }

  if (phase === "sent") {
    return (
      <Page>
        <Header step="02" title="Verifique seu email" emTail="· link enviado" />
        <Card>
          <p style={{ color: "var(--text)", fontSize: 14.5, lineHeight: 1.85 }}>
            Enviamos um link de acesso para <strong style={{ color: "var(--accent)" }}>{confirmedEmail}</strong>.
          </p>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
            O link expira em <span style={{ color: "var(--text)" }}>30 minutos</span> e
            funciona uma única vez. Em dev, a entrega passa pelo Sidekiq —
            cheque <code style={{ color: "var(--accent)" }}>log/development.log</code> ou
            o painel do Sidekiq.
          </p>
          <div style={{ marginTop: 24 }}>
            <Link to="/" style={mutedLinkStyle()}>← voltar ao início</Link>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <Header step="01" title="Entrar como empresa" emTail="· acesso por link" />

      <Card>
        <form onSubmit={handleSubmit} className="grid gap-5">
          {error && (
            <div style={{
              padding: "10px 14px",
              background: "rgba(181,97,53,0.08)",
              border: "1px solid rgba(181,97,53,0.35)",
              color: "var(--warn)", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <Field label="Email corporativo" hint="o mesmo que você usou no cadastro">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   autoComplete="email" required disabled={phase === "sending"}
                   placeholder="hr@suaempresa.com" />
          </Field>

          <div className="flex items-center justify-between gap-4 pt-2">
            <Link to="/companies/new" style={mutedLinkStyle()}>
              não tem conta? criar
            </Link>
            <PrimaryButton type="submit" disabled={phase === "sending"}>
              {phase === "sending" ? "Enviando…" : "Enviar link"}
            </PrimaryButton>
          </div>
        </form>
      </Card>

      <p style={{ marginTop: 32, color: "var(--muted)", fontSize: 12.5, lineHeight: 1.7 }}>
        beheld não pede senha. Você recebe um link de uso único válido por 30 minutos
        sempre que precisar acessar.
      </p>
    </Page>
  );
}

// ── primitives (same as the other auth pages) ──────────────────────────────

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto" style={{ maxWidth: 720, padding: "64px 32px 96px", color: "var(--text)" }}>
      {children}
    </div>
  );
}

function Header({ step, title, emTail }: { step: string; title: string; emTail?: string }) {
  return (
    <header className="mb-8">
      <div className="mb-3 font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        empresa · login
      </div>
      <div className="flex flex-wrap items-baseline gap-6">
        <span className="font-mono uppercase"
              style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}>
          {step}
        </span>
        <h1 className="font-semibold"
            style={{ color: "var(--text)", fontSize: 28, letterSpacing: "-0.025em", lineHeight: 1.15 }}>
          {title}
          {emTail && <span style={{ color: "var(--muted)", fontWeight: 400 }}> {emTail}</span>}
        </h1>
      </div>
    </header>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)", padding: 24 }}>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
        {label}
        {hint && <span style={{ color: "var(--muted-soft)", letterSpacing: 0, textTransform: "none" }}> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
           style={{
             font: "inherit", fontSize: 14,
             padding: "10px 12px",
             color: "var(--text)", background: "var(--bg)",
             border: "1px solid var(--rule)",
             borderRadius: 0, outline: "none",
             ...(props.style ?? {}),
           }} />
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props}
            style={{
              font: "inherit", fontSize: 13,
              padding: "8px 18px",
              background: "var(--text)", color: "var(--bg)",
              border: "1px solid var(--text)",
              borderRadius: 0, letterSpacing: "0.02em",
              cursor: props.disabled ? "not-allowed" : "pointer",
              opacity: props.disabled ? 0.5 : 1,
              ...(props.style ?? {}),
            }} />
  );
}

function mutedLinkStyle(): React.CSSProperties {
  return {
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
    fontSize: 11, color: "var(--muted)", letterSpacing: "0.14em",
    textTransform: "uppercase",
    textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3,
  };
}
