/**
 * B3H31DSection — "02 B3H31D": how B3H31D lives on the machine.
 *
 * Structure (mirrors the reference DOM 1:1):
 *   - 4-card grid (B3H31D · local / sinais·L1+L2 / bundle·Ed25519 / $0)
 *   - two-col "Como vive na sua máquina": h3/p blocks + vertical
 *     pipeline diagram (.flow) ending on the green-bordered SQLite node
 *   - privacy table (.ptable) — what it never records
 *   - "sempre ligado" card
 *   - closing B3H31D pull quote
 */
import { Eyebrow } from "@/components/landing/Eyebrow";
import { PullQuote } from "@/components/landing/PullQuote";
import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

const CARDS = ["card1", "card2", "card3", "card4"] as const;

export function B3H31DSection() {
  const t = useT();
  return (
    <section id="B3H31D">
      <div className="wrap">
        <Eyebrow idx="02">{t("landing.b3h31d.eyebrow")}</Eyebrow>

        <div className="grid grid--4 reveal">
          {CARDS.map((c) => (
            <div key={c} className="cell cell--surface">
              <p className="card__k">{t(`landing.b3h31d.${c}.k` as TKey)}</p>
              <p className={c === "card4" ? "card__t sig" : "card__t"}>
                {t(`landing.b3h31d.${c}.t` as TKey)}
              </p>
              <p className="card__d">{t(`landing.b3h31d.${c}.d` as TKey)}</p>
            </div>
          ))}
        </div>

        <div className="two-col b3h31d__cols">
          <div>
            <h2 className="h-sect h-sub">{t("landing.b3h31d.lives_title")}</h2>
            <h3 className="h-mini">{t("landing.b3h31d.obs_title")}</h3>
            <p className="lede lede--gap">{t("landing.b3h31d.obs_body")}</p>
            <h3 className="h-mini">{t("landing.b3h31d.where_title")}</h3>
            <p className="lede">{t("landing.b3h31d.where_body")}</p>
          </div>
          <div className="reveal">
            <div className="flow">
              <div className="flow__node flow__node--source">
                {t("landing.b3h31d.flow.source")} <span className="desc">{t("landing.b3h31d.flow.source_desc")}</span>
              </div>
              <div className="flow__arrow">↓</div>
              <div className="flow__node">
                {t("landing.b3h31d.flow.mcp")} <span className="port">{t("landing.b3h31d.flow.mcp_port")}</span>
              </div>
              <div className="flow__arrow">↓</div>
              <div className="flow__node">
                {t("landing.b3h31d.flow.engine")} <span className="port">{t("landing.b3h31d.flow.engine_port")}</span>
              </div>
              <div className="flow__arrow">↓</div>
              <div className="flow__node flow__node--store">
                {t("landing.b3h31d.flow.sink")} <span className="port">{t("landing.b3h31d.flow.sink_port")}</span>
              </div>
            </div>
            <p className="flow__cap">{t("landing.b3h31d.flow.cap")}</p>
          </div>
        </div>

        <h3 className="h-table">{t("landing.b3h31d.never_title")}</h3>
        <table className="ptable">
          <thead>
            <tr>
              <th>{t("landing.b3h31d.never.col_data")}</th>
              <th>{t("landing.b3h31d.never.col_action")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t("landing.b3h31d.never.row1.data")}</td>
              <td>
                {t("landing.b3h31d.never.row1.action_pre")}
                <span className="h">{"[path:<hash 8 chars>]"}</span>
              </td>
            </tr>
            <tr>
              <td>{t("landing.b3h31d.never.row2.data")}</td>
              <td>{t("landing.b3h31d.never.row2.action")}</td>
            </tr>
            <tr>
              <td>{t("landing.b3h31d.never.row3.data")}</td>
              <td>{t("landing.b3h31d.never.row3.action")}</td>
            </tr>
            <tr>
              <td>{t("landing.b3h31d.never.row4.data")}</td>
              <td>{t("landing.b3h31d.never.row4.action")}</td>
            </tr>
          </tbody>
        </table>

        <div className="card card--always">
          <p className="card__k card__k--sig">{t("landing.b3h31d.always_k")}</p>
          <p className="card__d card__d--lg">{t("landing.b3h31d.always_body")}</p>
        </div>

        <PullQuote
          quoteKey="landing.b3h31d.quote"
          attrKey="landing.b3h31d.quote_attr"
          className="quote--closing"
        />
      </div>
    </section>
  );
}
