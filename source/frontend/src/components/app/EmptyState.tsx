/**
 * EmptyState — dashed-border "drop zone / awaiting data" block: 38×38
 * mono icon square, title + description, optional terminal command box
 * teaching the next move (`$ beheld snapshot --publish`).
 */
import type { ReactNode } from "react";

export function EmptyState({ icon = "↑", title, description, command }: {
  icon?: string;
  title: string;
  description: ReactNode;
  /** CLI command rendered in the dark mono box (without the `$`). */
  command?: string;
}) {
  return (
    <div className="empty">
      <span className="ic" aria-hidden="true">{icon}</span>
      <div>
        <p className="empty__t">{title}</p>
        <p className="empty__d">{description}</p>
        {command && (
          <div className="empty__cmd">
            <span className="pmt" aria-hidden="true">$</span>
            <code>{command}</code>
          </div>
        )}
      </div>
    </div>
  );
}
