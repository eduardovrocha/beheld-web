import type { VerifyResult } from "@/lib/verify";

interface Props {
  result: VerifyResult | null;
  busy?: boolean;
}

function Check({ label, ok, reason }: { label: string; ok: boolean; reason?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          ok ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
        }`}
        aria-label={ok ? "ok" : "failed"}
      >
        {ok ? "✓" : "✗"}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-200">{label}</div>
        {reason && (
          <div className="mt-0.5 break-words font-mono text-xs text-slate-400">{reason}</div>
        )}
      </div>
    </div>
  );
}

export function VerificationStatus({ result, busy }: Props) {
  if (busy) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
        Verificando assinatura no navegador...
      </div>
    );
  }
  if (!result) return null;

  const borderClass = result.ok ? "border-emerald-700/50" : "border-rose-700/50";
  const headerClass = result.ok ? "text-emerald-300" : "text-rose-300";

  return (
    <div className={`space-y-3 rounded-lg border ${borderClass} bg-slate-900/50 p-4`}>
      <div className={`text-sm font-medium ${headerClass}`}>
        {result.ok ? "✓ Bundle verificado localmente" : "✗ Verificação falhou"}
      </div>
      <div className="space-y-2">
        <Check label="schema" ok={result.checks.schema.ok} reason={result.checks.schema.reason} />
        <Check label="hash" ok={result.checks.hash.ok} reason={result.checks.hash.reason} />
        <Check
          label="signature (Ed25519)"
          ok={result.checks.signature.ok}
          reason={result.checks.signature.reason}
        />
      </div>
      <div className="border-t border-slate-800 pt-2 text-xs text-slate-500">
        Verificação 100% no navegador via{" "}
        <code className="text-slate-400">crypto.subtle</code> — nenhum dado é
        enviado de volta ao servidor.
      </div>
    </div>
  );
}
