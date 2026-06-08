import { apiBase } from "@/lib/api";

export interface CliVersion {
  version: string;
  commit_sha: string;
  published_at: string;
  tag: "latest" | "stable" | "legacy" | null;
}

export type ApiResult<T> =
  | ({ kind: "ok" } & T)
  | { kind: "error"; status: number; message: string };

function binaryVersionUrl(): string {
  const override = (import.meta.env.VITE_BINARY_VERSION_URL as string | undefined) ?? "";
  return override.length > 0 ? override : `${apiBase()}/api/version`;
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response | Error> {
  try {
    return await fetch(url, init);
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err));
  }
}

export async function listCliVersions(): Promise<
  ApiResult<{ versions: CliVersion[] }>
> {
  const res = await safeFetch(`${apiBase()}/api/v1/docs/cli/versions`);
  if (res instanceof Error) {
    return { kind: "error", status: 0, message: res.message };
  }
  if (!res.ok) {
    return { kind: "error", status: res.status, message: `HTTP ${res.status}` };
  }
  const versions = (await res.json()) as CliVersion[];
  return { kind: "ok", versions };
}

export async function fetchCliDoc(
  version: string,
): Promise<ApiResult<{ markdown: string }>> {
  const res = await safeFetch(
    `${apiBase()}/api/v1/docs/cli/${encodeURIComponent(version)}`,
  );
  if (res instanceof Error) {
    return { kind: "error", status: 0, message: res.message };
  }
  if (!res.ok) {
    return { kind: "error", status: res.status, message: `HTTP ${res.status}` };
  }
  const markdown = await res.text();
  return { kind: "ok", markdown };
}

export async function fetchBinaryVersion(): Promise<
  ApiResult<{ version: string; commit?: string }>
> {
  const res = await safeFetch(binaryVersionUrl());
  if (res instanceof Error) {
    return { kind: "error", status: 0, message: res.message };
  }
  if (!res.ok) {
    return { kind: "error", status: res.status, message: `HTTP ${res.status}` };
  }
  const data = (await res.json()) as { version: string; commit?: string };
  return { kind: "ok", version: data.version, commit: data.commit };
}
