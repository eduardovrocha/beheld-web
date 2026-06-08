export type SyncStatus = "in_sync" | "out_of_sync" | "unknown";

interface DocRef {
  version: string;
  commit_sha: string;
}

interface BinaryRef {
  version: string;
  commit?: string;
}

export function computeSyncStatus(
  doc: DocRef,
  binary: BinaryRef | null | undefined,
): SyncStatus {
  if (!binary) return "unknown";

  // Prioridade 1: comparação por commit (mais precisa)
  if (binary.commit && doc.commit_sha) {
    const a = doc.commit_sha.toLowerCase().trim();
    const b = binary.commit.toLowerCase().trim();
    if (a === b || a.startsWith(b) || b.startsWith(a)) return "in_sync";
    return "out_of_sync";
  }

  // Fallback: comparação por version
  if (binary.version && doc.version) {
    return binary.version === doc.version ? "in_sync" : "out_of_sync";
  }

  return "unknown";
}
