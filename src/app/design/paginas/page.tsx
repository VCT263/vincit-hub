"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import { I } from "@/components/icons";
import { timeAgo } from "@/lib/design";
import { confirmarExclusao } from "@/lib/lixeira";
import Lixeira from "@/components/lixeira/Lixeira";
import { DESTINOS, STATUS, TIPOS, atual, type Briefing, type Tipo } from "@/lib/paginas";

/* Design · Páginas e sites: briefing → Claude cria o código → prévia → cliente aprova → entrega. */
export default function Paginas() {
  const router = useRouter();
  const [rows, setRows] = useState<any[] | null>(null);
  const [trash, setTrash] = useState<any[]>([]);
  const [perfis, setPerfis] = useState<any[]>([]);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [nova, setNova] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<{ title: string; tipo: Tipo; account_id: string; brand_id: string } & Briefing>({ title: "", tipo: "landing", account_id: "", brand_id: "", destino: "nuvemshop" });

  useEffect(() => {
    const s = createClient();
    s.from("web_pages").select("id,title,tipo,status,account_id,versions,comments,updated_at,archived_at").order("updated_at", { ascending: false })
      .then(({ data }) => { setRows((data || []).filter((r) => !r.archived_at)); setTrash((data || []).filter((r) => r.archived_at)); });
    s.from("ig_accounts").select("id,username").order("created_at").then(({ data }) => setPerfis(data || []));
    s.from("design_projects").select("id,title,data").eq("kind", "marca").is("archived_at", null).order("updated_at", { ascending: false }).then(({ data }) => setMarcas(data || []));
  }, []);

  // ao escolher o perfil, a marca ligada a ele vem junto
  function perfil(id: string) {
    const m = marcas.find((x) => x.data?.perfil_id === id);
    setF((v) => ({ ...v, account_id: id, brand_id: m?.id || v.brand_id }));
  }

  async function criar(pedir: boolean) {
    if (!f.title.trim()) return;
    setBusy(true);
    const { title, tipo, account_id, brand_id, ...briefing } = f;
    const { data, error } = await createClient().from("web_pages").insert({
      title: title.trim(), tipo, account_id: account_id || null, brand_id: brand_id || null, briefing, status: pedir ? "pedido" : "rascunho",
    }).select("id").single();
    if (error || !data) { setBusy(false); window.alert("Não deu para criar: " + (error?.message || "")); return; }
    router.push(`/design/paginas/${data.id}${pedir ? "?pedido=1" : ""}`);
  }

  async function remove(r: any) {
    if (!(await confirmarExclusao(`a página "${r.title}"`))) return;
    const at = new Date().toISOString();
    const { error } = await createClient().from("web_pages").update({ archived_at: at }).eq("id", r.id);
    if (error) return;
    setRows((x) => x && x.filter((y) => y.id !== r.id));
    setTrash((t) => [{ ...r, archived_at: at }, ...t]);
  }
  async function recuperar(id: string) {
    const { error } = await createClient().from("web_pages").update({ archived_at: null }).eq("id", id);
    if (error) return;
    const r = trash.find((x) => x.id === id);
    setTrash((t) => t.filter((x) => x.id !== id));
    if (r) setRows((x) => [{ ...r, archived_at: null }, ...(x || [])]);
  }

  const nomePerfil = (id: string) => perfis.find((p) => p.id === id)?.username;
  const campo = (k: keyof Briefing, l: string, ph: string, rows = 2) => (
    <label className="block"><span className="label">{l}</span>
      <textarea className="input min-h-0" rows={rows} placeholder={ph} value={(f[k] as string) || ""} onChange={(e) => setF((v) => ({ ...v, [k]: e.target.value }))} /></label>
  );

  return (
    <>
      <PageHead kicker="Design · 03 Páginas" title="Páginas e sites" desc="O Claude cria o código a partir do briefing e da marca. Você e o cliente veem a prévia no celular e no notebook, comentam, aprovam, e o código vai para onde a página vai morar.">
        <button onClick={() => setNova((v) => !v)} className="btn btn-mint"><I.plus className="w-4 h-4" />Nova página</button>
      </PageHead>

      {nova && (
        <section className="card p-4 sm:p-6 mb-8 rise">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2"><span className="label">Nome da página</span>
              <input className="input" autoFocus placeholder="Ex.: Site ISYS, Landing Natal 2026" value={f.title} onChange={(e) => setF((v) => ({ ...v, title: e.target.value }))} /></label>
            <div className="md:col-span-2">
              <span className="label">Tipo</span>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {TIPOS.map((t) => (
                  <button key={t.k} type="button" onClick={() => setF((v) => ({ ...v, tipo: t.k }))}
                    className={`text-left rounded-xl border p-3 transition-colors ${f.tipo === t.k ? "border-mint bg-mint/5" : "border-line hover:border-fog"}`}>
                    <p className="font-semibold text-sm">{t.l}</p><p className="text-xs text-fog mt-0.5">{t.d}</p>
                  </button>
                ))}
              </div>
            </div>
            <label className="block"><span className="label">Perfil (puxa briefing, voz e posts)</span>
              <select className="input" value={f.account_id} onChange={(e) => perfil(e.target.value)}>
                <option value="">Independente, sem perfil</option>
                {perfis.map((p) => <option key={p.id} value={p.id}>@{p.username}</option>)}
              </select></label>
            <label className="block"><span className="label">Manual da marca</span>
              <select className="input" value={f.brand_id} onChange={(e) => setF((v) => ({ ...v, brand_id: e.target.value }))}>
                <option value="">Sem manual (o Claude propõe a direção)</option>
                {marcas.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select></label>
            {campo("objetivo", "Objetivo da página", "Ex.: vender a coleção de Natal pelo site e pelo WhatsApp")}
            {campo("publico", "Para quem", "Ex.: mulheres de 30 a 55, do 38 ao 46, Goiânia e região")}
            {campo("oferta", "Oferta e prova", "Ex.: frete grátis acima de R$ 299, troca fácil, clientes reais")}
            {campo("secoes", "Seções ou telas que precisa", "Ex.: início, coleção Jeanswear, produto, sobre a fundadora")}
            {campo("referencias", "Referências", "Links de sites que gosta e o que gosta em cada um")}
            <label className="block"><span className="label">Onde vai ficar</span>
              <select className="input" value={f.destino} onChange={(e) => setF((v) => ({ ...v, destino: e.target.value }))}>
                {DESTINOS.map((d) => <option key={d.k} value={d.k}>{d.l}</option>)}
              </select></label>
            <div className="md:col-span-2">{campo("observacoes", "Observações", "O que mais o Claude precisa saber", 3)}</div>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            <button onClick={() => criar(true)} disabled={busy || !f.title.trim()} className="btn btn-mint"><I.spark className="w-4 h-4" />{busy ? "Criando…" : "Criar e pedir ao Claude"}</button>
            <button onClick={() => criar(false)} disabled={busy || !f.title.trim()} className="btn btn-ghost">Salvar briefing</button>
          </div>
        </section>
      )}

      <p className="font-mono text-[11px] text-fog tracking-widest uppercase mb-3">Suas páginas{rows ? ` · ${rows.length}` : ""}</p>
      {rows === null ? <div className="card h-40 animate-pulse" /> : !rows.length ? (
        <div className="card p-8 text-center">
          <p className="font-semibold">Nenhuma página ainda</p>
          <p className="text-sm text-fog mt-1 max-w-md mx-auto">Faça o briefing, escolha o perfil e o manual, e o Claude cria a primeira versão pelo conector VINCIT HUB.</p>
          <button onClick={() => setNova(true)} className="btn btn-mint mt-4"><I.plus className="w-4 h-4" />Nova página</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((r) => {
            const v = atual(r), st = STATUS[r.status as keyof typeof STATUS] || STATUS.rascunho;
            const abertos = (r.comments || []).filter((c: any) => !c.resolvido && c.de === "cliente").length;
            return (
              <div key={r.id} className="card overflow-hidden group relative hover:border-mint transition-colors">
                <Link href={`/design/paginas/${r.id}`} className="block p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`chip ${st.tone === "mint" ? "chip-mint" : ""}`} style={st.tone === "warn" ? { color: "#f2c46d", borderColor: "#f2c46d55" } : undefined}>{st.l}</span>
                    <span className="text-[11px] text-fog">{TIPOS.find((t) => t.k === r.tipo)?.l}</span>
                  </div>
                  <p className="font-display font-bold text-lg leading-tight pr-8">{r.title}</p>
                  <p className="text-xs text-fog mt-2">
                    {r.account_id && nomePerfil(r.account_id) ? `@${nomePerfil(r.account_id)} · ` : ""}
                    {v ? `v${v.n} · ${v.telas.length} tela${v.telas.length === 1 ? "" : "s"}` : "sem versão"}
                    {abertos ? ` · ${abertos} comentário${abertos === 1 ? "" : "s"}` : ""} · {timeAgo(r.updated_at)}
                  </p>
                </Link>
                <button onClick={() => remove(r)} className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-ink/80 text-fog hover:text-danger grid place-items-center sm:opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label="Excluir página"><I.trash className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
        </div>
      )}
      <Lixeira nome="Páginas" itens={trash.map((r) => ({ id: r.id, titulo: r.title, sub: TIPOS.find((t) => t.k === r.tipo)?.l, at: r.archived_at }))} onRecuperar={recuperar} />
    </>
  );
}
