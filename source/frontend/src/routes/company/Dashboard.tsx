/**
 * /company/dashboard — the recruiter's record of what already happened.
 * Distinct from /directory (active search) — here you see totals, the
 * activity feed, the messages you've sent, and the devs you bookmarked.
 */
import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { MessagesList } from "@/components/company/MessagesList";
import { RecentActivity } from "@/components/company/RecentActivity";
import { SavedDevsList } from "@/components/company/SavedDevsList";
import { StatsGrid } from "@/components/company/StatsGrid";
import { useCompanyDashboard } from "@/hooks/useCompanyDashboard";

export function CompanyDashboardPage() {
  const navigate = useNavigate();
  const {
    stats, recentActivity, messages, savedDevs,
    loading, error, authRequired,
    updateNote, removeSavedDev,
  } = useCompanyDashboard();

  useEffect(() => {
    if (authRequired) navigate("/sessions/company/new", { replace: true });
  }, [authRequired, navigate]);

  return (
    <Shell>
      <Hero />
      {loading && !error && (
        <p style={{ color: "var(--muted)", fontSize: 13, padding: "32px 0" }}>
          Carregando dashboard…
        </p>
      )}
      {error && (
        <Section num="00" title="Falha ao carregar">
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>{error}</p>
        </Section>
      )}
      {!loading && !error && (
        <>
          <Section num="01" title="Visão geral" emTail="· totais e taxa de resposta">
            <StatsGrid stats={stats} />
          </Section>
          <Section num="02" title="Atividade recente" emTail="· verificações e mensagens"
                   right={recentActivity.length > 0 ? `últimas ${recentActivity.length}` : "—"}>
            <RecentActivity events={recentActivity} />
          </Section>
          <Section num="03" title="Mensagens" emTail="· tudo que sua empresa enviou"
                   right={messages.length === 0 ? "0" : String(messages.length)}>
            <MessagesList messages={messages} />
          </Section>
          <Section num="04" title="Devs salvos" emTail="· bookmarks privados da empresa"
                   right={savedDevs.length === 0 ? "0" : String(savedDevs.length)}>
            <SavedDevsList savedDevs={savedDevs}
                           onUpdateNote={updateNote} onRemove={removeSavedDev} />
          </Section>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto" style={{ maxWidth: 1032, padding: "64px 32px 96px", color: "var(--text)" }}>
      {children}
    </div>
  );
}

function Hero() {
  return (
    <header className="mb-12">
      <div className="mb-3 font-mono uppercase"
           style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.18em" }}>
        empresa · dashboard
      </div>
      <h1 className="font-semibold"
          style={{ color: "var(--text)", fontSize: 34, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
        Painel
        <span style={{ color: "var(--muted)", fontWeight: 400 }}> · o registro do que já aconteceu</span>
      </h1>
    </header>
  );
}

function Section({ num, title, emTail, right, children }: {
  num: string; title: string; emTail?: string; right?: string; children: ReactNode;
}) {
  return (
    <section className="py-12" style={{ borderTop: "1px solid var(--rule)" }}>
      <div className="mb-8 flex flex-wrap items-baseline gap-6">
        <span className="font-mono uppercase"
              style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}>
          {num}
        </span>
        <h2 className="font-semibold"
            style={{ color: "var(--text)", fontSize: 22, letterSpacing: "-0.02em" }}>
          {title}
          {emTail && <span style={{ color: "var(--muted)", fontWeight: 400 }}> {emTail}</span>}
        </h2>
        {right && (
          <span className="ml-auto font-mono uppercase"
                style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}>
            {right}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
