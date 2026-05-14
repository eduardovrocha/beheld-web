import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { ProfileCard } from "@/components/ProfileCard";
import { useT } from "@/i18n/I18nProvider";
import { fetchBundle } from "@/lib/api";
import type { Bundle } from "@/lib/types";
import { verifyBundle, type VerifyResult } from "@/lib/verify";

export function VerifyPublic() {
  const t = useT();
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

  if (!id) return <ErrorBox title={t("verify.public.error.title")} message={t("verify.public.error.id_missing")} />;
  if (error) return <ErrorBox title={t("verify.public.error.title")} message={error} />;
  if (!bundle) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-72 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/60" />
        <div className="h-44 w-full animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/40" />
        <div className="h-44 w-full animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/40" />
      </div>
    );
  }

  return <ProfileCard bundle={bundle} result={result} verifying={verifying} shortId={id} />;
}

function ErrorBox({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 dark:border-rose-700/40 bg-rose-50 dark:bg-rose-950/30 p-6 text-rose-700 dark:text-rose-200">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-rose-600/80 dark:text-rose-300/80">{message}</div>
    </div>
  );
}
