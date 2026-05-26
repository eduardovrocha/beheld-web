/**
 * Magic-link consumption (`/sessions/company/verify?token=...`).
 *
 * Lands here when a recruiter clicks the link in their email. Exchanges
 * the one-shot token for a signed cookie via POST /api/v1/sessions/
 * company/verify and redirects into the directory (or shows a clear
 * reason if the link is invalid / expired / already used).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { verifyCompanyToken, type VerifyFailureReason } from "@/lib/companyApi";

type Phase =
  | { kind: "verifying" }
  | { kind: "ok"; companyName: string; redirectTo: string }
  | { kind: "fail"; reason: VerifyFailureReason };

const FAIL_COPY: Record<VerifyFailureReason, { title: string; body: string }> = {
  not_found: {
    title: "Link inválido",
    body:  "Não encontramos esse link. Talvez tenha sido digitado incorretamente ou copiado parcialmente.",
  },
  expired: {
    title: "Link expirado",
    body:  "Este link já passou da validade de 30 minutos. Solicite um novo.",
  },
  used: {
    title: "Link já usado",
    body:  "Cada link funciona uma única vez por segurança. Solicite um novo.",
  },
  unknown: {
    title: "Não foi possível verificar",
    body:  "Algo deu errado ao conferir o link. Tente novamente em alguns segundos.",
  },
};

export function CompanyVerify() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const fetchedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>({ kind: "verifying" });

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const token = params.get("token") ?? "";
    if (!token) {
      setPhase({ kind: "fail", reason: "not_found" });
      return;
    }

    (async () => {
      const result = await verifyCompanyToken(token);
      if (result.ok) {
        setPhase({ kind: "ok", companyName: result.company.name, redirectTo: result.redirect_to });
        // Brief confirmation, then navigate inside the SPA. /directory now
        // lives at :5173 — no full reload, the cookie travels via the
        // browser's localhost cookie jar.
        setTimeout(() => navigate(result.redirect_to, { replace: true }), 900);
      } else {
        setPhase({ kind: "fail", reason: result.reason });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Page>
      <Header step="03" title="Verificando link" emTail="· magic-link · empresa" />

      <Card>
        {phase.kind === "verifying" && (
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
            Conferindo seu link de acesso…
          </p>
        )}

        {phase.kind === "ok" && (
          <>
            <p style={{ color: "var(--text)", fontSize: 15, lineHeight: 1.7 }}>
              ✓ Sessão criada para <strong style={{ color: "var(--accent)" }}>{phase.companyName}</strong>.
            </p>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
              Redirecionando para o diretório…
            </p>
          </>
        )}

        {phase.kind === "fail" && (
          <>
            <p style={{ color: "var(--warn)", fontSize: 15, lineHeight: 1.7, fontWeight: 500 }}>
              {FAIL_COPY[phase.reason].title}
            </p>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>
              {FAIL_COPY[phase.reason].body}
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/companies/new" style={{
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                fontSize: 11, color: "var(--text)", letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "6px 14px",
                border: "1px solid var(--text)",
                textDecoration: "none",
              }}>
                criar conta
              </Link>
              <Link to="/" style={{
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                fontSize: 11, color: "var(--muted)", letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "6px 14px",
                border: "1px solid var(--rule)",
                textDecoration: "none",
              }}>
                voltar
              </Link>
            </div>
          </>
        )}
      </Card>
    </Page>
  );
}

// ── shell (same primitives as CompaniesNew) ─────────────────────────────────

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
        empresa · sessão
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
