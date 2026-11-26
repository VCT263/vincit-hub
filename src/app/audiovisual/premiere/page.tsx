"use client";
import { useCallback, useEffect, useState } from "react";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

type Kit = { id?: string; name: string; account_id?: string | null; data: any };

const STATUS: Record<string, { label: string; cls: string }> = {
  aguardando_plano: { label: "Esperando o Claude", cls: "text-amber-300 border-amber-300/40" },
  plano_pronto: { label: "Plano pronto", cls: "text-mint border-mint/40" },
  aplicado: { label: "Aplicado no Premiere", cls: "text-fog" },
  cancelado: { label: "Descartado", cls: "text-fog opacity-60" },
};

const EMPTY: Kit = {
  name: "",
  data: {
    cores: { destaque: "#F5C84C", texto: "#FFFFFF", fundo: "#0C0C0D" },
    fontes: { titulo: "Anton", legenda: "Inter Black" },
    legenda: { estilo: "impacto", palavras_por_tela: 3, caixa_alta: true },
    regras: { corte_max_s: 4, silencio_ms: 350, trilha_db: -18 },
    mogrts: { legenda: "", gancho: "", cta: "", lower_third: "" },
  },
};

const ESTILOS = [
  ["impacto", "Impacto (caixa alta, palavra em destaque)"],
  ["caixa", "Caixa colorida atrás da palavra"],
  ["editorial", "Editorial (serifada, discreta)"],
  ["documental", "Documental (lower-third, cortes longos)"],
];

const fmtDate = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function Premiere() {
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [kits, setKits] = useState<Kit[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [edit, setEdit] = useState<Kit | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = createClient();
    const [{ data: se }, { data: k }, { data: p }] = await Promise.all([
      s.from("av_edit_sessions").select("id,sequence_name,project_name,status,request,plan,plan_note,created_at,content_id,duration_sec").order("created_at", { ascending: false }).limit(20),
      s.from("av_style_kits").select("id,name,account_id,data").order("updated_at", { ascending: false }),
      s.from("ig_accounts").select("id,username"),
    ]);
    setSessions(se || []);
    setKits((k as Kit[]) || []);
    setProfiles(p || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveKit() {
    if (!edit) return;
    if (!edit.name.trim()) { setMsg("Dê um nome ao kit."); return; }
    const s = createClient();
    const row = { name: edit.name.trim(), account_id: edit.account_id || null, data: edit.data, updated_at: new Date().toISOString() };
    const { error } = edit.id ? await s.from("av_style_kits").update(row).eq("id", edit.id) : await s.from("av_style_kits").insert(row);
    if (error) { setMsg(error.message); return; }
    setEdit(null); setMsg("Kit salvo."); load();
  }
  async function delKit(id: string) {
    const s = createClient();
    await s.from("av_style_kits").delete().eq("id", id);
    setEdit(null); load();
  }
  const set = (path: string[], v: any) => setEdit((e) => {
    if (!e) return e;
    const data = structuredClone(e.data || {});
    let o = data;
    for (const k of path.slice(0, -1)) o = o[k] = o[k] || {};
    o[path[path.length - 1]] = v;
    return { ...e, data };
  });
  const d = edit?.data || {};

  const counts = (p: any) => ["cortes", "legendas", "titulos", "zooms", "insercoes", "marcadores"].map((k) => [k, (p?.[k] || []).length]).filter(([, n]) => n);

  return (
    <>
      <PageHead kicker="AUDIOVISUAL · PÓS-PRODUÇÃO" title="Premiere com o Claude"
        desc="O painel VINCIT HUB no Premiere manda a sequência (clipes e transcrição) para o Claude. O Claude devolve o plano de edição no estilo do kit do cliente e você aplica com um clique, revisando tudo no Premiere." />

      {msg && <p className="text-sm text-mint mb-4">{msg}</p>}

      <div className="grid lg:grid-cols-3 gap-4">
        <section className="card p-5 lg:col-span-1">
          <p className="font-display text-lg font-extrabold">Como usar</p>
          <ol className="text-sm text-fog mt-3 space-y-3 list-decimal pl-4">
            <li>Baixe o plugin e dê dois cliques no arquivo. O Creative Cloud instala. Precisa do Premiere Pro 25.6 ou mais novo.
              <a href="/downloads/vincit-hub-premiere.ccx" className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-mint text-ink"><I.arrow className="w-4 h-4" />Baixar plugin (.ccx)</a>
            </li>
            <li>No Premiere: Janela › Extensões › <b className="text-paper">VINCIT HUB</b>. Entre com seu e-mail e senha do HUB.</li>
            <li>Abra a sequência, escolha o conteúdo e o kit e clique em <b className="text-paper">Transcrever clipes</b> e depois em <b className="text-paper">Enviar ao Claude</b>.</li>
            <li>No Claude (com o conector VINCIT HUB), peça: <i className="text-paper">&quot;faça o plano da edição do Premiere&quot;</i>.</li>
            <li>O plano aparece no painel em segundos. Escolha o que aplicar. Cmd+Z desfaz tudo de uma vez.</li>
          </ol>
          <p className="text-xs text-fog mt-4">O que já entra direto: marcadores, legendas e títulos com os MOGRTs do kit, zoom por keyframe e B-roll que já está no projeto. Os cortes entram como marcadores para você conferir e cortar.</p>
        </section>

        <section className="card p-5 lg:col-span-2 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-extrabold">Edições enviadas</p>
            <button onClick={load} className="chip"><I.refresh className="w-3.5 h-3.5" />Atualizar</button>
          </div>
          {!sessions ? <p className="text-sm text-fog mt-4">Carregando…</p> : !sessions.length ? (
            <p className="text-sm text-fog mt-4">Nenhuma sequência enviada ainda. Elas aparecem aqui quando você clica em Enviar ao Claude no Premiere.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {sessions.map((s) => {
                const st = STATUS[s.status] || STATUS.aguardando_plano;
                return (
                  <li key={s.id} className="py-3 flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{s.sequence_name || "Sequência"} <span className="text-fog font-normal">· {s.project_name}</span></p>
                      {s.request && <p className="text-sm text-fog mt-0.5">“{s.request}”</p>}
                      {s.plan?.resumo && <p className="text-sm mt-1">{s.plan.resumo}</p>}
                      {s.plan && <div className="flex flex-wrap gap-1.5 mt-2">{counts(s.plan).map(([k, n]) => <span key={k as string} className="chip">{n} {k}</span>)}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`chip ${st.cls}`}>{st.label}</span>
                      <p className="text-xs text-fog mt-1 font-mono">{fmtDate(s.created_at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5 mt-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-display text-lg font-extrabold">Kits de estilo</p>
            <p className="text-sm text-fog">Cores, fontes, legenda e MOGRTs de cada cliente. O Claude segue o kit no plano e o plugin usa os MOGRTs.</p>
          </div>
          <button onClick={() => setEdit(structuredClone(EMPTY))} className="chip"><I.plus className="w-3.5 h-3.5" />Novo kit</button>
        </div>

        {!edit && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {kits.map((k) => (
              <button key={k.id} onClick={() => setEdit(structuredClone({ ...EMPTY, ...k, data: { ...EMPTY.data, ...k.data } }))} className="text-left rounded-xl border border-line p-4 hover:border-mint-dim">
                <div className="flex gap-1.5">{["destaque", "texto", "fundo"].map((c) => <span key={c} className="w-5 h-5 rounded-md border border-line" style={{ background: k.data?.cores?.[c] }} />)}</div>
                <p className="font-semibold mt-3">{k.name}</p>
                <p className="text-xs text-fog mt-0.5">{k.data?.fontes?.titulo} · {k.data?.fontes?.legenda} · {k.data?.legenda?.estilo}</p>
              </button>
            ))}
            {!kits.length && <p className="text-sm text-fog">Nenhum kit ainda. Crie aqui ou peça ao Claude: &quot;crie o kit de estilo da ISYS&quot;.</p>}
          </div>
        )}

        {edit && (
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-3">
              <Field label="Nome do kit"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="ISYS · Impacto amarelo" /></Field>
              <Field label="Perfil">
                <select className="input" value={edit.account_id || ""} onChange={(e) => setEdit({ ...edit, account_id: e.target.value || null })}>
                  <option value="">Nenhum</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>@{p.username}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-2">
                {[["destaque", "Destaque"], ["texto", "Texto"], ["fundo", "Fundo"]].map(([k, l]) => (
                  <Field key={k} label={l}><input type="color" className="w-full h-9 rounded-lg bg-transparent" value={d.cores?.[k] || "#000000"} onChange={(e) => set(["cores", k], e.target.value)} /></Field>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Fonte do título"><input className="input" value={d.fontes?.titulo || ""} onChange={(e) => set(["fontes", "titulo"], e.target.value)} /></Field>
                <Field label="Fonte da legenda"><input className="input" value={d.fontes?.legenda || ""} onChange={(e) => set(["fontes", "legenda"], e.target.value)} /></Field>
              </div>
              <Field label="Estilo de legenda">
                <select className="input" value={d.legenda?.estilo || "impacto"} onChange={(e) => set(["legenda", "estilo"], e.target.value)}>
                  {ESTILOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Palavras por tela"><input type="number" min={1} max={8} className="input" value={d.legenda?.palavras_por_tela ?? 3} onChange={(e) => set(["legenda", "palavras_por_tela"], +e.target.value)} /></Field>
                <Field label="Caixa alta"><select className="input" value={d.legenda?.caixa_alta ? "1" : "0"} onChange={(e) => set(["legenda", "caixa_alta"], e.target.value === "1")}><option value="1">Sim</option><option value="0">Não</option></select></Field>
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Field label="Corte máx. (s)"><input type="number" className="input" value={d.regras?.corte_max_s ?? 4} onChange={(e) => set(["regras", "corte_max_s"], +e.target.value)} /></Field>
                <Field label="Silêncio (ms)"><input type="number" className="input" value={d.regras?.silencio_ms ?? 350} onChange={(e) => set(["regras", "silencio_ms"], +e.target.value)} /></Field>
                <Field label="Trilha (dB)"><input type="number" className="input" value={d.regras?.trilha_db ?? -18} onChange={(e) => set(["regras", "trilha_db"], +e.target.value)} /></Field>
              </div>
              <p className="text-xs text-fog">Caminho dos MOGRTs no computador de quem edita (ex.: /Users/vinicius/MOGRTs/legenda-impacto.mogrt). Sem MOGRT, legendas e títulos entram como marcadores.</p>
              {[["legenda", "MOGRT da legenda"], ["gancho", "MOGRT do gancho"], ["cta", "MOGRT do CTA"], ["lower_third", "MOGRT do lower-third"]].map(([k, l]) => (
                <Field key={k} label={l}><input className="input font-mono text-xs" value={d.mogrts?.[k] || ""} onChange={(e) => set(["mogrts", k], e.target.value)} placeholder="/Users/…/arquivo.mogrt" /></Field>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={saveKit} className="px-4 py-2 rounded-xl bg-mint text-ink font-semibold text-sm">Salvar kit</button>
                <button onClick={() => setEdit(null)} className="px-4 py-2 rounded-xl border border-line text-sm">Cancelar</button>
                {edit.id && <button onClick={() => delKit(edit.id!)} className="ml-auto px-3 py-2 rounded-xl text-sm text-red-400"><I.trash className="w-4 h-4" /></button>}
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs text-fog">{label}</span><div className="mt-1">{children}</div></label>;
}
