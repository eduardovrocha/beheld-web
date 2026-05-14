import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { BundleSummary } from "@/components/BundleSummary";
import { VerificationStatus } from "@/components/VerificationStatus";
import { badgeUrl, fetchBundle } from "@/lib/api";
import type { Bundle } from "@/lib/types";
import { verifyBundle, type VerifyResult } from "@/lib/verify";

export function VerifyPublic() {
  const { id } = useParams<{ id: string }>();

  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setBundle(null);
    setError(null);
    setResult(null);
    setVerifying(true);

    (async () => {
      try {
        const b = await fetchBundle(id);
        if (cancelled) return;
        setBundle(b);
        const r = await verifyBundle(b);
        if (cancelled) return;
        setResult(r);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return <ErrorBox message="Bundle id ausente." />;
  if (error) return <ErrorBox message={error} />;
  if (!bundle) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-72 animate-pulse rounded bg-slate-800/60" />
        <div className="h-44 w-full animate-pulse rounded-2xl bg-slate-800/40" />
        <div className="h-44 w-full animate-pulse rounded-2xl bg-slate-800/40" />
      </div>
    );
  }

  const fingerprint = bundle.public_key.replace(/^ed25519:/, "").slice(0, 12);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-2 text-xs text-slate-500">
          <span className="font-mono">snapshot id:</span>
          <code className="text-slate-300">{id}</code>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">
          Perfil verificado · score{" "}
          <span className="text-emerald-400">
            {bundle.payload.scores.overall}/100
          </span>
        </h1>
        <div className="text-sm text-slate-400">
          Gerado em{" "}
          <time dateTime={bundle.payload.created_at}>
            {new Date(bundle.payload.created_at).toLocaleString()}
          </time>{" "}
          · devprofile v{bundle.payload.devprofile_version} · pubkey{" "}
          <code className="text-slate-300">{fingerprint}</code>
        </div>
      </header>

      <VerificationStatus result={result} busy={verifying} />

      <BundleSummary bundle={bundle} />

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Badge embed
        </h2>
        <div className="mb-4 flex items-center gap-4">
          <img src={badgeUrl(id)} alt={`devprofile ${bundle.payload.scores.overall}/100`} />
          <span className="text-xs text-slate-500">SVG servido pelo backend, cacheado por 5 min.</span>
        </div>
        <div className="rounded-lg bg-slate-950/50 p-3 font-mono text-xs text-slate-400">
          {`<img src="${badgeUrl(id)}" alt="devprofile ${bundle.payload.scores.overall}/100">`}
        </div>
      </section>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-700/40 bg-rose-950/30 p-6 text-rose-200">
      <div className="font-semibold">Não foi possível carregar o bundle</div>
      <div className="mt-1 text-sm text-rose-300/80">{message}</div>
    </div>
  );
}
