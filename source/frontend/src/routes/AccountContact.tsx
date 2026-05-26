/**
 * Recruiter → dev contact form (`/accounts/:account_id/contact`).
 *
 * Same vocabulary as Directory / CompaniesNew: numbered section header,
 * white card with hairline, mono uppercase field labels, Switzer body.
 *
 * Auth via signed company cookie. 401 → bounce to /companies/new.
 * 404 from the API (opt-out / no bundle) → permanent unavailable state.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  loadContactTarget,
  sendContact,
  ContactAuthError,
  ContactUnavailableError,
  type ContactTarget,
} from "@/lib/contactsApi";

type Phase =
  | { kind: "loading" }
  | { kind: "ready"; target: ContactTarget["account"] }
  | { kind: "unavailable" }
  | { kind: "sending"; target: ContactTarget["account"] }
  | { kind: "sent"; handle: string };

export function AccountContact() {
  const { account_id } = useParams<{ account_id: string }>();
  const navigate = useNavigate();

  const [phase, setPhase]       = useState<Phase>({ kind: "loading" });
  const [jobTitle, setJobTitle] = useState("");
  const [body, setBody]         = useState("");
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!account_id) { setPhase({ kind: "unavailable" }); return; }
    (async () => {
      try {
        const t = await loadContactTarget(account_id);
        setPhase({ kind: "ready", target: t.account });
      } catch (e) {
        if (e instanceof ContactAuthError)         navigate("/companies/new", { replace: true });
        else if (e instanceof ContactUnavailableError) setPhase({ kind: "unavailable" });
        else                                       setError((e as Error).message);
      }
    })();
  }, [account_id, navigate]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase.kind !== "ready") return;
    setError(null);
    const target = phase.target;
    setPhase({ kind: "sending", target });

    try {
      const result = await sendContact(account_id!, {
        job_title: jobTitle.trim(),
        body:      body.trim(),
      });
      if (result.ok) {
        setPhase({ kind: "sent", handle: target.handle });
      } else {
        setError(result.message);
        setPhase({ kind: "ready", target });
      }
    } catch (e) {
      if (e instanceof ContactAuthError)              navigate("/companies/new", { replace: true });
      else if (e instanceof ContactUnavailableError)  setPhase({ kind: "unavailable" });
      else {
        setError((e as Error).message);
        setPhase({ kind: "ready", target });
      }
    }
  }

  if (phase.kind === "loading") {
    return (
      <Shell>
        <Header step="01" title="Carregando…" />
      </Shell>
    );
  }

  if (phase.kind === "unavailable") {
    return (
      <Shell>
        <Header step="01" title="Perfil indisponível" emTail="· não encontrável no momento" />
        <Card>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
            Este dev pode ter saído do diretório, removido o bundle ou ainda não publicou.
          </p>
          <div style={{ marginTop: 16 }}>
            <Link to="/directory" style={linkStyle()}>← voltar ao diretório</Link>
          </div>
        </Card>
      </Shell>
    );
  }

  if (phase.kind === "sent") {
    return (
      <Shell>
        <Header step="02" title="Mensagem enviada" emTail="· aguardando resposta do dev" />
        <Card>
          <p style={{ color: "var(--text)", fontSize: 15, lineHeight: 1.7 }}>
            ✓ Sua mensagem chegou ao dashboard de <strong style={{ color: "var(--accent)" }}>{phase.handle}</strong>.
          </p>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
            Se o dev clicar <span style={{ color: "var(--text)" }}>Responder</span>, beheld encaminha
            o email + telefone dele direto para o seu email cadastrado.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            <Link to="/directory" style={primaryLinkStyle()}>voltar ao diretório</Link>
          </div>
        </Card>
      </Shell>
    );
  }

  const target = phase.target;
  const sending = phase.kind === "sending";

  return (
    <Shell>
      <Header step="01" title="Entrar em contato" emTail={`· enviando para ${target.handle}`} />

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

          <Field label="Cargo da vaga" hint="opcional">
            <Input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                   autoComplete="off" disabled={sending} />
          </Field>

          <Field label="Mensagem" hint="o dev verá no dashboard antes de aceitar">
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
                      required disabled={sending}
                      rows={6}
                      style={{
                        font: "inherit", fontSize: 14,
                        padding: "10px 12px",
                        color: "var(--text)", background: "var(--bg)",
                        border: "1px solid var(--rule)",
                        borderRadius: 0, outline: "none",
                        resize: "vertical", minHeight: 120,
                        fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif",
                        lineHeight: 1.55,
                      }} />
          </Field>

          <div className="flex items-center justify-between gap-4 pt-2">
            <Link to="/directory" style={linkStyle()}>← voltar</Link>
            <PrimaryButton type="submit" disabled={sending}>
              {sending ? "Enviando…" : "Enviar mensagem"}
            </PrimaryButton>
          </div>
        </form>
      </Card>

      <p style={{ marginTop: 32, color: "var(--muted)", fontSize: 12.5, lineHeight: 1.7 }}>
        beheld não compartilha email ou telefone de <span style={{ color: "var(--text)" }}>{target.handle}</span> até
        que ele clique <span style={{ color: "var(--text)" }}>Responder</span> na sua mensagem.
      </p>
    </Shell>
  );
}

// ── shell + primitives (kept local to keep this route self-contained) ──────

function Shell({ children }: { children: ReactNode }) {
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
        empresa · contato
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

function linkStyle(): React.CSSProperties {
  return {
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
    fontSize: 11, color: "var(--muted)", letterSpacing: "0.14em",
    textTransform: "uppercase",
    textDecoration: "underline", textDecorationColor: "var(--rule)", textUnderlineOffset: 3,
  };
}

function primaryLinkStyle(): React.CSSProperties {
  return {
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
    fontSize: 11, color: "var(--bg)", letterSpacing: "0.14em",
    textTransform: "uppercase",
    background: "var(--text)", border: "1px solid var(--text)",
    padding: "6px 14px",
    textDecoration: "none",
  };
}
