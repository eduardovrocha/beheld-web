import type { SyncStatus } from "@/lib/docs/sync-status";

interface MetaStripProps {
  source: string;        // e.g. "cli-references-v0-4-1.md"
  commitSha: string;     // e.g. "d41f476"
  generatedAt: string;   // ISO or human string
  syncStatus: SyncStatus;
}

function syncLabel(status: SyncStatus): { icon: string; text: string; cls: string } {
  switch (status) {
    case "in_sync":
      return { icon: "●", text: "em sincronia com o binário instalado", cls: "ok" };
    case "out_of_sync":
      return { icon: "⚠", text: "documento gerado em commit anterior ao do seu binário", cls: "warn" };
    case "unknown":
    default:
      return { icon: "○", text: "estado de sincronia desconhecido", cls: "" };
  }
}

export function MetaStrip({ source, commitSha, generatedAt, syncStatus }: MetaStripProps) {
  const sync = syncLabel(syncStatus);
  return (
    <div className="docs-meta">
      <span><b>fonte:</b> <code>{source}</code></span>
      <span className="sep">·</span>
      <span><b>commit:</b> <code>{commitSha}</code></span>
      <span className="sep">·</span>
      <span><b>gerado em:</b> <span>{generatedAt}</span></span>
      <span className="sep">·</span>
      <span className={sync.cls}>
        <span>{sync.icon} {sync.text}</span>
      </span>
    </div>
  );
}
