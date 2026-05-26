/**
 * Recruiter signup page (`/companies/new`).
 *
 * Same visual vocabulary as Home/Dashboard — Switzer body, mono uppercase
 * labels with letter-spacing, white card on cream bg, accent gold for
 * numbers/links, primary button inverts text/bg. Two states:
 *   1. Form    — name + email, submit triggers POST /api/v1/companies.
 *   2. Sent    — confirms the magic link was mailed.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { signupCompany, type SignupResult } from "@/lib/companyApi";

type Phase = "form" | "sending" | "sent";

export function CompaniesNew() {
  const [phase, setPhase]   = useState<Phase>("form");
  const [name,  setName]    = useState("");
  const [email, setEmail]   = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [genericError, setGenericError] = useState<string | null>(null);
  const [confirmedEmail, setConfirmedEmail] = useState<string>("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({}); setGenericError(null);
    setPhase("sending");

    const result: SignupResult = await signupCompany({ name: name.trim(), email: email.trim() });

    if (result.ok) {
      setConfirmedEmail(result.email);
      setPhase("sent");
      return;
    }

    if (result.status === 422) {
      setErrors(result.errors);
    } else {
      setGenericError(result.message ?? "Falha de comunicação com o servidor.");
    }
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
            <Link to="/" style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              fontSize: 11, color: "var(--muted)", letterSpacing: "0.14em",
              textTransform: "uppercase",
              textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3,
            }}>
              ← voltar ao início
            </Link>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <Header step="01" title="Cadastro de empresa" emTail="· acesso ao diretório" />

      <Card>
        <form onSubmit={handleSubmit} className="grid gap-5">
          {genericError && (
            <div style={{
              padding: "10px 14px",
              background: "rgba(181,97,53,0.08)",
              border: "1px solid rgba(181,97,53,0.35)",
              color: "var(--warn)", fontSize: 13,
            }}>
              {genericError}
            </div>
          )}

          <Field label="Nome da empresa" error={errors.name?.[0]}>
            <Input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              autoComplete="organization" required disabled={phase === "sending"} />
          </Field>

          <Field label="Email corporativo" hint="enviaremos o link de acesso" error={errors.email?.[0]}>
            <Input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" required disabled={phase === "sending"} />
          </Field>

          <div className="flex items-center justify-between gap-4 pt-2">
            <Link to="/sessions/company/new" style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              fontSize: 11, color: "var(--muted)", letterSpacing: "0.14em",
              textTransform: "uppercase",
              textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3,
            }}>
              já tem conta? entrar
            </Link>
            <PrimaryButton type="submit" disabled={phase === "sending"}>
              {phase === "sending" ? "Enviando…" : "Criar conta"}
            </PrimaryButton>
          </div>
        </form>
      </Card>

      <p style={{ marginTop: 32, color: "var(--muted)", fontSize: 12.5, lineHeight: 1.7 }}>
        beheld nunca compartilha email ou telefone de um dev até que ele clique{" "}
        <span style={{ color: "var(--text)" }}>Responder</span> na sua mensagem.
        O cadastro é gratuito durante o piloto.
      </p>
    </Page>
  );
}

// ── shell + primitives (mirror of the language used by Dashboard) ──────────

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
        empresa · cadastro
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

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
        {label}
        {hint && (
          <span style={{ color: "var(--muted-soft)", letterSpacing: 0, textTransform: "none" }}> · {hint}</span>
        )}
      </span>
      {children}
      {error && (
        <span style={{ color: "var(--warn)", fontSize: 12, marginTop: 2 }}>
          {capitalize(error)}
        </span>
      )}
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
             borderRadius: 0,
             outline: "none",
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
              borderRadius: 0,
              letterSpacing: "0.02em",
              cursor: props.disabled ? "not-allowed" : "pointer",
              opacity: props.disabled ? 0.5 : 1,
              transition: "background 120ms ease",
              ...(props.style ?? {}),
            }} />
  );
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
