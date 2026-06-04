/**
 * DaemonLocalSection — "daemon local" deep-dive (4 numbered
 * subsections + a flow diagram + a "never records" table + a closing
 * B3H31D quote).
 *
 * Subsection structure mirrors the spec exactly:
 *   01 · o que ele observa  — short body
 *   02 · onde tudo vive     — body + small flow diagram (3 nodes +
 *                             arrows + sink). Diagram is pure CSS;
 *                             no SVG file.
 *   03 · o que ele nunca grava — body + 4-row table
 *   04 · sempre ligado      — short body
 *   closing quote (B3H31DQuote tight)
 *
 * All strings come from `landing.daemon.*`. Numbers (01..04) and
 * port literals (:7337, :7338) are i18n strings so EN/ES can choose
 * to keep them — they do.
 */
import { B3H31DQuote } from "@/components/landing/B3H31DQuote";
import { Section } from "@/components/landing/Section";
import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

type RowKey = "row1" | "row2" | "row3" | "row4";
const ROWS: RowKey[] = ["row1", "row2", "row3", "row4"];

export function DaemonLocalSection() {
  const t = useT();

  return (
    <Section
      id="daemon-local"
      num={t("landing.daemon.s1.num")}
      title={t("landing.daemon.title")}
      aside={t("landing.daemon.aside")}
      noBorderTop
    >
      {/* ── 01 — o que ele observa ── */}
      <Sub
        num={t("landing.daemon.s1.num")}
        eyebrow={t("landing.daemon.title")}
        title={t("landing.daemon.s1.title")}
        body={t("landing.daemon.s1.body")}
        delay={1}
      />

      {/* ── 02 — onde tudo vive ── */}
      <Sub
        num={t("landing.daemon.s2.num")}
        eyebrow={t("landing.daemon.title")}
        title={t("landing.daemon.s2.title")}
        body={t("landing.daemon.s2.body")}
        delay={2}
      >
        <FlowDiagram />
      </Sub>

      {/* ── 03 — o que ele nunca grava ── */}
      <Sub
        num={t("landing.daemon.s3.num")}
        eyebrow={t("landing.daemon.title")}
        title={t("landing.daemon.s3.title")}
        delay={3}
      >
        <table className="never-table">
          <thead>
            <tr>
              <th>{t("landing.daemon.s3.col_data")}</th>
              <th>{t("landing.daemon.s3.col_action")}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r}>
                <td>{t(`landing.daemon.s3.${r}.data` as TKey)}</td>
                <td>{t(`landing.daemon.s3.${r}.action` as TKey)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Sub>

      {/* ── 04 — sempre ligado ── */}
      <Sub
        num={t("landing.daemon.s4.num")}
        eyebrow={t("landing.daemon.title")}
        title={t("landing.daemon.s4.title")}
        body={t("landing.daemon.s4.body")}
        delay={4}
      />

      <B3H31DQuote
        quoteKey="landing.daemon.closing_quote"
        attrKey="landing.daemon.closing_quote_attr"
      />
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Subsection primitive (num + eyebrow + title + body) — reused by
//  RealSessionsSection too.
// ─────────────────────────────────────────────────────────────────────────

export type SubProps = {
  num: string;
  eyebrow: string;
  title: string;
  body?: string;
  delay?: 1 | 2 | 3 | 4;
  children?: React.ReactNode;
};

export function Sub({ num, eyebrow, title, body, delay = 1, children }: SubProps) {
  return (
    <div className={`subsection reveal d${delay}`}>
      <div className="sub-num">{num}</div>
      <div className="sub-body">
        <div className="sub-head">
          <h3>{title}</h3>
          <span className="sub-eyebrow">{eyebrow}</span>
        </div>
        {body && <p className="sub-text">{body}</p>}
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  FlowDiagram — pure-CSS flow showing Source → MCP → Engine → SQLite
// ─────────────────────────────────────────────────────────────────────────

function FlowDiagram() {
  const t = useT();
  return (
    <div className="flow">
      <div className="flow-row">
        <div className="flow-box">
          <div className="flow-label">{t("landing.daemon.s2.diagram.source")}</div>
        </div>
        <span className="flow-arrow" aria-hidden="true">→</span>
        <div className="flow-box">
          <div className="flow-label">{t("landing.daemon.s2.diagram.mcp")}</div>
          <div className="flow-port">{t("landing.daemon.s2.diagram.mcp_port")}</div>
        </div>
        <span className="flow-arrow flow-arrow--fmt" aria-hidden="true">
          {t("landing.daemon.s2.diagram.format")}
        </span>
        <div className="flow-box">
          <div className="flow-label">{t("landing.daemon.s2.diagram.engine")}</div>
          <div className="flow-port">{t("landing.daemon.s2.diagram.engine_port")}</div>
        </div>
      </div>
      <div className="flow-down" aria-hidden="true">↓</div>
      <div className="flow-sink">{t("landing.daemon.s2.diagram.sink")}</div>
      <div className="flow-foot">{t("landing.daemon.s2.diagram.footnote")}</div>
    </div>
  );
}
