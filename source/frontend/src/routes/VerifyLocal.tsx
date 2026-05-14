import { useCallback, useState } from "react";

import { ProfileCard } from "@/components/ProfileCard";
import type { Bundle } from "@/lib/types";
import { verifyBundle, type VerifyResult } from "@/lib/verify";

type State =
  | { kind: "idle" }
  | { kind: "verifying"; filename: string; bundle: Bundle }
  | { kind: "done"; filename: string; bundle: Bundle; result: VerifyResult }
  | { kind: "error"; message: string };

export function VerifyLocal() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [drag, setDrag] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Bundle;
      // Show the bundle immediately with a "verifying" pill; the verification
      // runs in the background and the pill / proof footer update once done.
      setState({ kind: "verifying", filename: file.name, bundle: parsed });
      const result = await verifyBundle(parsed);
      setState({ kind: "done", filename: file.name, bundle: parsed, result });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onPickFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Verificar um <code className="text-emerald-600 dark:text-emerald-400">.dpbundle</code> offline
        </h1>
        <p className="max-w-2xl text-slate-600 dark:text-slate-400">
          Arraste um arquivo aqui ou selecione. Toda a verificação roda{" "}
          <span className="text-slate-800 dark:text-slate-200">no seu navegador</span> via{" "}
          <code className="text-slate-800 dark:text-slate-200">crypto.subtle</code> — nada sai da máquina.
        </p>
      </header>

      <label
        htmlFor="bundle-input"
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`block cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
          drag
            ? "border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-500/5"
            : "border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-500"
        }`}
      >
        <div className="text-slate-700 dark:text-slate-300">
          {drag ? "Solte para verificar" : "Arraste o .dpbundle ou clique para selecionar"}
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          Esperando JSON com campos <code>version</code>, <code>payload</code>,{" "}
          <code>hash</code>, <code>signature</code>, <code>public_key</code>.
        </div>
        <input
          id="bundle-input"
          type="file"
          accept=".dpbundle,application/json"
          className="sr-only"
          onChange={onPickFile}
        />
      </label>

      {state.kind === "error" && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-700/40 bg-rose-50 dark:bg-rose-950/30 p-6 text-rose-700 dark:text-rose-200">
          <div className="font-semibold">Não foi possível parsear o arquivo</div>
          <div className="mt-1 text-sm text-rose-600/80 dark:text-rose-300/80">{state.message}</div>
        </div>
      )}

      {(state.kind === "verifying" || state.kind === "done") && (
        <div className="space-y-3">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Arquivo: <code className="text-slate-800 dark:text-slate-200">{state.filename}</code>
          </div>
          <ProfileCard
            bundle={state.bundle}
            result={state.kind === "done" ? state.result : null}
            verifying={state.kind === "verifying"}
            shortId={null}
          />
        </div>
      )}
    </div>
  );
}
