import { Link } from "react-router-dom";

function Tile({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="font-mono text-xs uppercase tracking-wider text-slate-500">
        {step}
      </div>
      <h3 className="mt-2 text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}

export function Home() {
  return (
    <div className="space-y-16">
      <section className="space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-slate-100 md:text-5xl">
          Perfis de desenvolvedor{" "}
          <span className="text-emerald-400">verificáveis</span>,<br />
          construídos pelo uso real.
        </h1>
        <p className="max-w-2xl text-lg text-slate-400">
          O devprofile captura sinais técnicos (sequências de tools, ecossistemas,
          padrões de teste) localmente, sem nunca tocar conteúdo de conversas.
          Gera <span className="text-slate-200">snapshots assinados</span>{" "}
          (Ed25519) que qualquer pessoa pode verificar no navegador.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/verify"
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            Verificar um .dpbundle
          </Link>
          <a
            href="https://github.com/ioit-solutions/devprofile"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500"
          >
            Ver no GitHub
          </a>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Como funciona
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Tile
            step="01"
            title="Captura local"
            body="Hooks do Claude Code e Continue.dev emitem metadados (nomes de tool, extensões, sequência) — nunca o conteúdo. Tudo fica em ~/.devprofile/."
          />
          <Tile
            step="02"
            title="Snapshot assinado"
            body="devprofile snapshot empacota scores + signals num .dpbundle, hash SHA-256 + Ed25519 sign. A pubkey vai embutida — o bundle é autoverificável."
          />
          <Tile
            step="03"
            title="Compartilhe / verifique"
            body="--share faz upload para o portal, gera QR e URL curta. O navegador re-verifica via crypto.subtle — nada precisa confiar no servidor."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 font-mono text-sm leading-relaxed text-slate-300">
        <div className="text-slate-500"># gere e compartilhe</div>
        <div>$ devprofile snapshot --share</div>
        <div className="mt-2 text-slate-500"># verifique offline qualquer .dpbundle</div>
        <div>$ devprofile verify ~/Downloads/foo.dpbundle</div>
        <div className="mt-2 text-slate-500"># ou aqui no navegador</div>
        <div>
          $ open{" "}
          <Link to="/verify" className="text-emerald-400 hover:underline">
            /verify
          </Link>
        </div>
      </section>
    </div>
  );
}
