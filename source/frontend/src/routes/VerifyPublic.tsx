import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { ProfileCard } from "@/components/ProfileCard";
import { fetchBundle } from "@/lib/api";
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

  return <ProfileCard bundle={bundle} result={result} verifying={verifying} shortId={id} />;
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-700/40 bg-rose-950/30 p-6 text-rose-200">
      <div className="font-semibold">Não foi possível carregar o bundle</div>
      <div className="mt-1 text-sm text-rose-300/80">{message}</div>
    </div>
  );
}
