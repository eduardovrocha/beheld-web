import { useState } from "react";

const INSTALL_CMD = "curl beheld.dev/install | sh";
const GITHUB_URL = "https://github.com/eduardovrocha/beheld";

// ── Logo (lens) — mirrors mock SVG ──────────────────────────────────────────

function LensLogo() {
  return (
    <svg
      viewBox="0 0 240 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="beheld lens logo"
      className="h-16 w-auto"
      style={{ color: "var(--lens)" }}
    >
      <g stroke="currentColor" strokeWidth={1} opacity={0.35} strokeLinecap="round">
        <line x1="16" y1="50" x2="28" y2="50" />
        <line x1="212" y1="50" x2="224" y2="50" />
      </g>
      <path d="M 60 24 Q 40 50 60 76" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <path d="M 180 24 Q 200 50 180 76" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <line x1="66" y1="50" x2="174" y2="50" stroke="currentColor" strokeWidth={1} strokeDasharray="2 6" opacity={0.45} />
      <circle cx="120" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="120" cy="50" r="4" fill="currentColor" />
    </svg>
  );
}

// ── Reusable bits ────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-mono uppercase"
      style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}
    >
      {children}
    </span>
  );
}

function SectionHead({
  num,
  title,
  emTail,
  right,
}: {
  num: string;
  title: string;
  emTail?: string;
  right?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-baseline gap-6">
      <span
        className="font-mono uppercase"
        style={{ color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em" }}
      >
        {num}
      </span>
      <h2
        className="font-semibold"
        style={{ color: "var(--text)", fontSize: 22, letterSpacing: "-0.02em" }}
      >
        {title}
        {emTail ? (
          <span style={{ color: "var(--muted)", fontWeight: 400 }}> {emTail}</span>
        ) : null}
      </h2>
      {right ? (
        <span
          className="ml-auto font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}
        >
          {right}
        </span>
      ) : null}
    </div>
  );
}

// ── Terminal demo (mirrors mock right column of hero) ───────────────────────

function TerminalDemo() {
  return (
    <div
      className="overflow-hidden rounded-md font-mono"
      style={{
        background: "var(--term-bg)",
        border: "1px solid var(--term-rule)",
        color: "var(--term-text)",
        fontSize: 11.5,
        lineHeight: 1.5,
        boxShadow: "0 12px 28px -16px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="flex items-center gap-3.5 px-3.5 py-2.5"
        style={{ background: "var(--term-bar-tint)", borderBottom: "1px solid var(--term-rule)" }}
      >
        <div className="flex gap-1.5">
          {/* macOS traffic-light dots stay fixed across themes */}
          <span className="block size-2.5 rounded-full" style={{ background: "#ed6b5b" }} />
          <span className="block size-2.5 rounded-full" style={{ background: "#dab451" }} />
          <span className="block size-2.5 rounded-full" style={{ background: "#5fb47f" }} />
        </div>
        <span
          className="font-mono uppercase"
          style={{ color: "var(--term-muted)", fontSize: 10, letterSpacing: "0.12em" }}
        >
          ~/projects · beheld view --snapshot
        </span>
      </div>

      <div className="px-4 pb-5 pt-4">
        <span className="mb-3.5 block" style={{ color: "var(--term-text)" }}>
          <span style={{ color: "var(--term-prompt)" }}>$</span> beheld view --snapshot
        </span>

        <div
          className="mb-2 mt-3.5 font-mono uppercase"
          style={{ color: "var(--term-muted)", fontSize: 10, letterSpacing: "0.12em" }}
        >
          sinais observados · últimos 90d
        </div>
        <TermBar label="stack ratio (py/ts)" pct={87} value="87%" />
        <TermBar label="test ratio" pct={38} value="38%" />
        <TermBar label="react ratio" pct={2} value="2%" tone="dim" />

        <div className="my-2.5 border-t border-dashed" style={{ borderColor: "var(--term-rule)" }} />

        <TermSummary k="sessões 90d" v="87" delta="8 repos em L1" />
        <TermSummary k="trajetória L1" v="7 anos" delta="contínua desde 2017" />

        <div className="mt-3" style={{ color: "var(--term-muted)", fontSize: 10.5 }}>
          → test ratio é <span style={{ color: "var(--term-accent)" }}>4.2×</span> mediana global · bundle ed25519 · rev. 47
        </div>
      </div>
    </div>
  );
}

function TermBar({
  label,
  pct,
  value,
  tone,
}: {
  label: string;
  pct: number;
  value: string;
  tone?: "dim";
}) {
  return (
    <div
      className="grid items-center gap-2.5 py-0.5"
      style={{ gridTemplateColumns: "1fr 90px 30px" }}
    >
      <span style={{ color: "var(--term-key)" }}>{label}</span>
      <span className="relative block h-2 overflow-hidden" style={{ background: "var(--term-bar-bg)" }}>
        <span
          className="block h-full"
          style={{
            width: `${pct}%`,
            background: tone === "dim" ? "var(--term-dim)" : "var(--term-accent)",
          }}
        />
      </span>
      <span className="text-right tabular-nums" style={{ color: "var(--term-text)" }}>
        {value}
      </span>
    </div>
  );
}

function TermSummary({ k, v, delta }: { k: string; v: string; delta?: string }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="font-medium" style={{ color: "var(--term-key)" }}>
        {k}
      </span>
      <span className="tabular-nums" style={{ color: "var(--term-text)" }}>
        {v}
        {delta ? (
          <span className="ml-2" style={{ color: "var(--term-ok)" }}>
            {delta}
          </span>
        ) : null}
      </span>
    </div>
  );
}

// ── Install block (hero left column) ────────────────────────────────────────

function InstallBlock() {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <>
      <div
        className="mb-3.5 p-5"
        style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}
      >
        <div
          className="mb-2.5 font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.18em" }}
        >
          instale em uma linha
        </div>
        <div className="flex items-center gap-2.5 font-mono" style={{ color: "var(--text)", fontSize: 13 }}>
          <span className="font-medium" style={{ color: "var(--accent)" }}>
            $
          </span>
          <span>{INSTALL_CMD}</span>
          <button
            type="button"
            onClick={onCopy}
            className="ml-auto cursor-pointer font-mono uppercase transition-colors"
            style={{
              border: `1px solid ${copied ? "var(--ok)" : "var(--rule)"}`,
              color: copied ? "var(--ok)" : "var(--muted)",
              padding: "5px 11px",
              fontSize: 10,
              letterSpacing: "0.14em",
              background: "transparent",
            }}
          >
            {copied ? "copiado" : "copiar"}
          </button>
        </div>
      </div>
      <div
        className="mb-6 font-mono"
        style={{ color: "var(--muted-soft)", fontSize: 10, letterSpacing: "0.08em" }}
      >
        macOS e Linux · zero dependências · daemon local
      </div>

      <div className="inline-flex items-center gap-2">
        <span
          className="font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em" }}
        >
          produto
        </span>
        <span style={{ color: "var(--rule)" }}>·</span>
        <span
          className="font-mono uppercase"
          style={{ color: "var(--accent)", fontSize: 10, letterSpacing: "0.14em" }}
        >
          forever free for developers
        </span>
      </div>
    </>
  );
}

// ── Glance cards (section 01) ───────────────────────────────────────────────

function GlanceCard({
  label,
  num,
  note,
  numColor,
}: {
  label: string;
  num: string;
  note: React.ReactNode;
  numColor?: string;
}) {
  return (
    <div
      className="p-6"
      style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}
    >
      <div
        className="mb-3.5 font-mono uppercase"
        style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.18em" }}
      >
        {label}
      </div>
      <div
        className="mb-1.5 font-semibold"
        style={{
          color: numColor ?? "var(--text)",
          fontSize: 24,
          letterSpacing: "-0.025em",
          lineHeight: 1,
        }}
      >
        {num}
      </div>
      <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.65 }}>{note}</div>
    </div>
  );
}

// ── Claim row (section 02) ──────────────────────────────────────────────────

function ClaimRow({
  status,
  title,
  role,
  obs,
}: {
  status: "ok" | "warn";
  title: string;
  role: string;
  obs: string;
}) {
  return (
    <div
      className="grid items-start gap-4 px-5 py-4"
      style={{
        gridTemplateColumns: "32px 1fr",
        borderBottom: "1px solid var(--rule-soft)",
      }}
    >
      <div
        className="text-center font-mono"
        style={{ color: status === "ok" ? "var(--ok)" : "var(--warn)", fontSize: 14, lineHeight: 1.9 }}
      >
        {status === "ok" ? "✓" : "⚠"}
      </div>
      <div>
        <div
          className="font-medium"
          style={{ color: "var(--text)", fontSize: 14.5, lineHeight: 1.95 }}
        >
          {title}: <span style={{ color: "var(--accent)", fontWeight: 400 }}>{role}</span>
        </div>
        <div className="mt-1" style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.95 }}>
          {obs}
        </div>
      </div>
    </div>
  );
}

// ── Signal card (section 03) ────────────────────────────────────────────────

function SignalCard({
  title,
  meta,
  rows,
}: {
  title: string;
  meta: string;
  rows: { key: string; val: React.ReactNode }[];
}) {
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
      <div
        className="flex items-baseline justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <span className="font-semibold" style={{ color: "var(--text)", fontSize: 14 }}>
          {title}
        </span>
        <span
          className="font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.14em" }}
        >
          {meta}
        </span>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-baseline justify-between px-5 py-2.5"
          style={{ borderBottom: i === rows.length - 1 ? undefined : "1px solid var(--rule-soft)" }}
        >
          <span
            className="font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 10.5, letterSpacing: "0.12em" }}
          >
            {r.key}
          </span>
          <span
            className="text-right font-mono"
            style={{ color: "var(--text)", fontSize: 12 }}
          >
            {r.val}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Chain row (section 04) ──────────────────────────────────────────────────

function ChainRow({
  name,
  desc,
  detail,
  last,
}: {
  name: string;
  desc: string;
  detail: string;
  last?: boolean;
}) {
  return (
    <div
      className="grid items-center gap-4 px-5 py-4"
      style={{
        gridTemplateColumns: "32px 1fr 140px",
        borderBottom: last ? undefined : "1px solid var(--rule-soft)",
      }}
    >
      <div
        className="text-center font-mono"
        style={{ color: "var(--ok)", fontSize: 13 }}
      >
        ✓
      </div>
      <div>
        <div className="font-medium" style={{ color: "var(--text)", fontSize: 14 }}>
          {name}
        </div>
        <div className="mt-0.5" style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.9 }}>
          {desc}
        </div>
      </div>
      <div
        className="text-right font-mono"
        style={{ color: "var(--accent)", fontSize: 10, letterSpacing: "0.1em" }}
      >
        {detail}
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export function Home() {
  return (
    <div className="mx-auto" style={{ maxWidth: 1032, padding: "0 32px" }}>
      {/* ═══ DOC HEAD ═══════════════════════════════════════════════════ */}
      <div
        className="mb-12 pb-14 pt-16"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        {/* Canonical logo */}
        <div
          className="mb-14 pb-12 text-center"
          style={{ borderBottom: "1px solid var(--rule-soft)" }}
        >
          <div className="flex flex-col items-center gap-4">
            <LensLogo />
            <div
              className="font-semibold"
              style={{ color: "var(--text)", fontSize: 44, letterSpacing: "-0.025em", lineHeight: 1 }}
            >
              beheld
              <span style={{ color: "var(--accent)", fontWeight: 400 }}>.dev</span>
            </div>
            <div
              className="font-normal uppercase"
              style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em" }}
            >
              Beheld by <span style={{ color: "var(--accent)" }}>signal</span>. Decided by{" "}
              <span style={{ color: "var(--accent)" }}>you</span>.
            </div>
          </div>
          <div
            className="mt-6 font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em" }}
          >
            daemon local <span style={{ color: "var(--accent)" }}>·</span> sessões reais{" "}
            <span style={{ color: "var(--accent)" }}>·</span> open source
          </div>
        </div>

        {/* Hybrid hero: install + terminal */}
        <div className="grid items-start gap-12 md:grid-cols-2">
          <div>
            <InstallBlock />
          </div>
          <TerminalDemo />
        </div>
      </div>

      {/* ═══ LETTER ═════════════════════════════════════════════════════ */}
      <section className="py-20" style={{ borderBottom: "1px solid var(--rule)" }}>
        <Eyebrow>— sobre o produto</Eyebrow>
        <div className="mt-5" style={{ color: "var(--text)", fontSize: 15, lineHeight: 1.95 }}>
          O LinkedIn não viu você trabalhar. O recrutador não sabe que você escreveu aquele test antes do
          código. O gerente que te rejeitou não sabe que seu{" "}
          <span style={{ color: "var(--accent)", fontWeight: 500 }}>
            test ratio é quatro vezes a mediana global
          </span>
          . O beheld sabe. E pode mostrar — se você deixar.
        </div>
        <div
          className="mt-6 font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 11, letterSpacing: "0.14em" }}
        >
          isso é o trabalho real. não o linkedin. o trabalho.{" "}
          <span style={{ color: "var(--accent)" }}>·</span>{" "}
          <span style={{ color: "var(--accent)", fontWeight: 500 }}>forever free for developers</span>
        </div>
      </section>

      {/* ═══ 01 · CAPTURE ═══════════════════════════════════════════════ */}
      <section className="py-16" style={{ borderBottom: "1px solid var(--rule)" }}>
        <SectionHead
          num="01"
          title="O que o daemon"
          emTail="captura"
          right="sem setup extra"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlanceCard
            label="daemon"
            num="local"
            note={<>sem cloud · nada sai sem você assinar</>}
          />
          <GlanceCard
            label="sinais"
            num="L1 + L2"
            note={<>git histórico + sessões Claude Code</>}
          />
          <GlanceCard
            label="bundle"
            num="Ed25519"
            note={
              <>
                <strong style={{ color: "var(--accent)", fontWeight: 500 }}>assinado offline</strong> ·
                verificável sem o beheld
              </>
            }
          />
          <GlanceCard
            label="custo pro dev"
            num="$0"
            numColor="var(--ok)"
            note={
              <>
                para sempre ·{" "}
                <strong style={{ color: "var(--accent)", fontWeight: 500 }}>contrato público</strong>
              </>
            }
          />
        </div>
      </section>

      {/* ═══ 02 · CLAIMED vs DEMONSTRATED ═══════════════════════════════ */}
      <section className="py-16" style={{ borderBottom: "1px solid var(--rule)" }}>
        <SectionHead
          num="02"
          title="Claimed vs Demonstrated"
          emTail="· o delta verificável"
          right="3 estados possíveis"
        />
        <p
          className="mb-7 max-w-xl"
          style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.9 }}
        >
          O dev declara o que é. O daemon mostra o que{" "}
          <strong style={{ color: "var(--text)", fontWeight: 500 }}>
            de fato aparece nas sessões e no git
          </strong>
          . Onde os dois se encontram, o sinal é confirmado. Onde divergem, o sinal é limitado — e isso
          também é informação.
        </p>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
          <ClaimRow
            status="ok"
            title="Stack principal"
            role="Python, TypeScript"
            obs="Confirmado. 87% das sessões em Python/TS nos últimos 90 dias. 8 repositórios em L1."
          />
          <ClaimRow
            status="ok"
            title="Senioridade"
            role="8+ anos backend engineer"
            obs="Confirmado. L1 mostra atividade contínua desde 2017. Test ratio médio: 38% — 4.2× mediana global."
          />
          <ClaimRow
            status="warn"
            title="Especialização"
            role="Senior React Engineer"
            obs="Sinal limitado. React em 2 de 87 sessões. Nenhum repositório React em L1. Trajetória recente: Python/FastAPI."
          />
        </div>

        <div
          className="mt-4 p-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}
        >
          <div
            className="mb-4 font-mono uppercase"
            style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.16em" }}
          >
            self-declared · não verificado pelo beheld
          </div>
          <div className="mb-4 grid gap-5 sm:grid-cols-2">
            <div>
              <div
                className="mb-1.5 font-mono uppercase"
                style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.18em" }}
              >
                emprego autodeclarado
              </div>
              <div style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.95 }}>
                Stripe (2020–2022)
                <br />
                Stack Overflow (2018–2020)
              </div>
            </div>
            <div>
              <div
                className="mb-1.5 font-mono uppercase"
                style={{ color: "var(--muted)", fontSize: 9, letterSpacing: "0.18em" }}
              >
                formação autodeclarada
              </div>
              <div style={{ color: "var(--text)", fontSize: 13.5, lineHeight: 1.95 }}>
                Mestrado em Computação
                <br />
                USP, 2017
              </div>
            </div>
          </div>
          <div
            className="pt-3.5 italic"
            style={{
              color: "var(--muted-soft)",
              fontSize: 12,
              lineHeight: 1.75,
              borderTop: "1px solid var(--rule-soft)",
            }}
          >
            O beheld não verifica histórico de empregadores nem formação. Apresenta como o dev declarou,
            sem confirmação externa.
          </div>
        </div>
      </section>

      {/* ═══ 03 · HOW IT WORKS ══════════════════════════════════════════ */}
      <section className="py-16" style={{ borderBottom: "1px solid var(--rule)" }}>
        <SectionHead
          num="03"
          title="Como funciona"
          emTail="· três passos"
          right="setup único"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <SignalCard
            title="L1 · Git histórico"
            meta="instalação única"
            rows={[
              {
                key: "Instalar",
                val: (
                  <>
                    <span style={{ color: "var(--accent)", fontWeight: 500 }}>$</span> beheld init
                  </>
                ),
              },
              { key: "Daemon", val: <>background · SQLite local</> },
              { key: "Chave Ed25519", val: <>gerada offline · sua</> },
              { key: "L1 importado", val: <>git log automático</> },
            ]}
          />
          <SignalCard
            title="L2 · Trajetória"
            meta="contínuo"
            rows={[
              { key: "Observação", val: <>cada sessão Claude Code</> },
              {
                key: "Conteúdo",
                val: <span style={{ color: "var(--accent)" }}>nunca registrado</span>,
              },
              {
                key: "Gerar bundle",
                val: (
                  <>
                    <span style={{ color: "var(--accent)", fontWeight: 500 }}>$</span> beheld snapshot
                  </>
                ),
              },
              { key: "Resultado", val: <>URL pública verificável</> },
            ]}
          />
        </div>
      </section>

      {/* ═══ 04 · VERIFICATION CHAIN ════════════════════════════════════ */}
      <section className="py-16">
        <SectionHead
          num="04"
          title="Cadeia de verificação"
          emTail="· cinco camadas"
          right="Tier · fully_verifiable"
        />
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--rule)" }}>
          <ChainRow
            name="Assinatura Ed25519"
            desc="Chave do dev assina o bundle. Verificável offline, sem depender do beheld."
            detail="signature_only"
          />
          <ChainRow
            name="Chain hash"
            desc="Cada bundle referencia o anterior. Reescrever um quebra toda a cadeia."
            detail="chain_intact"
          />
          <ChainRow
            name="Identidade GitHub"
            desc="OAuth vincula a chave pública do dev a um usuário GitHub verificado."
            detail="identity_verified"
          />
          <ChainRow
            name="Engine version"
            desc="Hash do binário conferido contra build reproducível publicado."
            detail="engine_verified"
          />
          <ChainRow
            name="Sigstore Rekor"
            desc="Hash registrado em log público append-only. Impede backdating."
            detail="fully_verifiable"
            last
          />
        </div>
      </section>

      {/* ═══ FOOTER ═════════════════════════════════════════════════════ */}
      <footer
        className="mt-6 grid items-end gap-8 py-16 sm:grid-cols-2"
        style={{ borderTop: "1px solid var(--rule)" }}
      >
        <div className="font-mono" style={{ color: "var(--text)", fontSize: 13 }}>
          <span style={{ color: "var(--accent)" }}>$</span> {INSTALL_CMD}
        </div>
        <div
          className="text-right font-mono uppercase"
          style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em", lineHeight: 2 }}
        >
          <div style={{ color: "var(--accent)", fontWeight: 500 }}>forever free for developers</div>
          <div className="space-x-1">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
              style={{ color: "var(--muted)" }}
            >
              GitHub
            </a>
            <span>·</span>
            <a href="#" className="hover:underline" style={{ color: "var(--muted)" }}>
              Docs
            </a>
            <span>·</span>
            <a href="#" className="hover:underline" style={{ color: "var(--muted)" }}>
              Manifesto
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
