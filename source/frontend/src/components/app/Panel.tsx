/**
 * Panel — large surface block with a hairlined header row.
 *
 *   <Panel header={<PanelHeader title=… meta=… right=…/>} flush>
 *     …body…
 *   </Panel>
 *
 * `flush` removes body padding (lists with their own hairlines: ladder,
 * vchain, publication rows).
 */
import type { ReactNode } from "react";

export function Panel({ header, flush = false, children }: {
  header: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      {header}
      <div className={`panel__b${flush ? " panel__b--flush" : ""}`}>{children}</div>
    </section>
  );
}

export function PanelHeader({ title, meta, right }: {
  title: string;
  /** Caption next to the title (mono, dim). */
  meta?: string;
  /** Right-aligned slot: meta text or a link. */
  right?: ReactNode;
}) {
  return (
    <div className="panel__h">
      <div className="left">
        <h2>{title}</h2>
        {meta && <span className="meta">{meta}</span>}
      </div>
      {right}
    </div>
  );
}
