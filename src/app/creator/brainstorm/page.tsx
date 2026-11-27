"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PageHead from "@/components/PageHead";
import Modal from "@/components/agency/Modal";
import { I } from "@/components/icons";
import { BOARD_COLORS, BUCKET, CATEGORIES, TEMPLATES, timeAgo } from "@/lib/brainstorm";
import { apagarComLixeira } from "@/lib/lixeira";

type Board = { id: string; title: string; color: string | null; preview: string | null; pinned: boolean; updated_at: string; scene: any; files: any };

export default function Brainstorm() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [q, setQ] = useState("");
  const [novo, setNovo] = useState(false);
  const [title, setTitle] = useState("");
  const [tpl, setTpl] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<Board | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await createClient().from("brainstorm_boards").select("id,title,color,preview,pinned,updated_at").is("archived_at", null).order("pinned", { ascending: false }).order("updated_at", { ascending: false });
    if (error) setErr("Não foi possível carregar os quadros. Tente de novo em instantes.");
    setBoards((data as any) || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e?: React.FormEvent) {
    e?.preventDefault(); setBusy(true);
    const t = TEMPLATES.find((x) => x.key === tpl);
    const color = BOARD_COLORS[Math.floor(Math.random() * BOARD_COLORS.length)];
    const { data, error } = await createClient().from("brainstorm_boards").insert({ title: title.trim() || t?.name || "Quadro sem título", color }).select("id").single();
    setBusy(false);
    if (error || !data) { setErr("Não foi possível criar o quadro."); return; }
    router.push(`/creator/brainstorm/${data.id}${t ? `?modelo=${t.key}` : ""}`);
  }

  async function save(b: Board, patch: Partial<Board>) {
    setBoards((xs) => xs && xs.map((x) => (x.id === b.id ? { ...x, ...patch } : x)));
    await createClient().from("brainstorm_boards").update(patch).eq("id", b.id);
  }

  async function duplicate(b: Board) {
    const s = createClient();
    const { data: full } = await s.from("brainstorm_boards").select("scene,files,preview,color").eq("id", b.id).single();
    if (!full) return;
    // as imagens continuam apontando para os arquivos do quadro original (mesma pasta do usuário)
    await s.from("brainstorm_boards").insert({ title: `${b.title} (cópia)`, scene: full.scene, files: full.files, preview: full.preview, color: full.color });
    setEdit(null); load();
  }

  async function remove(b: Board) {
    // as imagens ficam no bucket: o quadro pode voltar da lixeira com elas
    if (!(await apagarComLixeira({ tabela: "brainstorm_boards", filtro: { id: b.id }, oque: `o quadro "${b.title}"`, rotulo: `Brainstorm: ${b.title}`, link: "/creator/brainstorm" }))) return;
    setEdit(null); load();
  }

  const shown = (boards || []).filter((b) => !q || b.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHead kicker="Creator · 02 Criação" title="Brainstorm" desc="Quadro em branco infinito para pensar livre: texto, post-its, formas, setas, imagens, links e desenho à mão. Tudo salva sozinho.">
        <button onClick={() => { setTpl(""); setTitle(""); setNovo(true); }} className="btn btn-mint btn-sm"><I.plus className="w-4 h-4" /> Novo quadro</button>
      </PageHead>

      {err && <p className="text-danger text-sm mb-4">{err}</p>}

      <div className="mb-8 rise space-y-5">
        {CATEGORIES.map((cat) => (
          <div key={cat}>
            <p className="font-mono text-[11px] text-fog tracking-widest uppercase mb-3">Modelos · {cat}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {cat === "Ideias" && (
                <button onClick={() => { setTpl(""); setTitle(""); setNovo(true); }} className="card p-4 text-left hover:border-[var(--color-mint)] transition-colors group">
                  <div className="h-16 rounded-lg border border-dashed border-line grid place-items-center text-fog group-hover:text-mint"><I.plus className="w-6 h-6" /></div>
                  <p className="font-semibold text-sm mt-3">Em branco</p>
                  <p className="text-xs text-fog mt-1">Começa do zero, sem nada no quadro.</p>
                </button>
              )}
              {TEMPLATES.filter((t) => t.cat === cat).map((t) => (
                <button key={t.key} onClick={() => { setTpl(t.key); setTitle(t.name); setNovo(true); }} className="card p-4 text-left hover:border-[var(--color-mint)] transition-colors">
                  <TemplateThumb k={t.key} />
                  <p className="font-semibold text-sm mt-3">{t.name}</p>
                  <p className="text-xs text-fog mt-1 line-clamp-2">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="font-mono text-[11px] text-fog tracking-widest uppercase">Seus quadros{boards ? ` · ${boards.length}` : ""}</p>
        {!!boards?.length && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar quadro" className="input max-w-56 !py-1.5 text-sm" />}
      </div>

      {boards === null ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="card h-56 animate-pulse" />)}</div>
      ) : !boards.length ? (
        <div className="card p-10 text-center rise">
          <p className="font-display text-xl font-bold">Nenhum quadro ainda</p>
          <p className="text-fog text-sm mt-2 max-w-md mx-auto">Crie um quadro em branco ou comece por um modelo. Dá para colar imagens e links, arrastar arquivos e ligar ideias com setas.</p>
          <button onClick={() => setNovo(true)} className="btn btn-mint mt-5"><I.plus className="w-4 h-4" /> Criar o primeiro quadro</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((b, i) => (
            <div key={b.id} className="card overflow-hidden group rise relative" style={{ animationDelay: `${i * 0.03}s` }}>
              <Link href={`/creator/brainstorm/${b.id}`} className="block">
                <div className="h-40 bg-panel2 border-b border-line relative overflow-hidden">
                  {b.preview ? <img loading="lazy" decoding="async" src={b.preview} alt="" className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" /> : <div className="w-full h-full grid place-items-center text-fog text-xs">Quadro vazio</div>}
                  <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: b.color || "var(--color-mint)" }} />
                </div>
                <div className="p-4 pr-12">
                  <p className="font-semibold truncate">{b.pinned && <span className="text-mint mr-1">★</span>}{b.title}</p>
                  <p className="text-xs text-fog mt-1">Editado {timeAgo(b.updated_at)}</p>
                </div>
              </Link>
              <button onClick={() => setEdit(b)} className="absolute right-3 bottom-4 text-fog hover:text-paper px-2 py-1 rounded-md hover:bg-panel2" aria-label="Opções do quadro">⋯</button>
            </div>
          ))}
          {!shown.length && <p className="text-fog text-sm">Nenhum quadro com esse nome.</p>}
        </div>
      )}

      <Modal open={novo} title="Novo quadro" onClose={() => setNovo(false)}>
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="label">Nome</label>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Ex.: Ideias para a campanha de dezembro" />
          </div>
          <div>
            <label className="label">Modelo</label>
            <div className="space-y-3 max-h-[46vh] overflow-y-auto scroll-thin pr-1">
              {CATEGORIES.map((cat) => (
                <div key={cat}>
                  <p className="text-[11px] text-fog mb-1.5">{cat}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[...(cat === "Ideias" ? [{ key: "", name: "Em branco" }] : []), ...TEMPLATES.filter((t) => t.cat === cat)].map((t) => (
                      <button type="button" key={t.key} onClick={() => { setTpl(t.key); if (!title.trim() || TEMPLATES.some((x) => x.name === title)) setTitle(t.key ? t.name : ""); }} className={`text-left rounded-[10px] border px-3 py-2 text-sm ${tpl === t.key ? "border-[var(--color-mint)] text-mint" : "border-line text-paper hover:border-fog"}`}>{t.name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setNovo(false)} className="btn btn-ghost">Cancelar</button>
            <button disabled={busy} className="btn btn-mint">{busy ? "Criando…" : "Criar e abrir"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!edit} title="Opções do quadro" onClose={() => setEdit(null)}>
        {edit && (
          <div className="space-y-4">
            <div>
              <label className="label">Nome</label>
              <input defaultValue={edit.title} onBlur={(e) => e.target.value.trim() && e.target.value !== edit.title && save(edit, { title: e.target.value.trim() })} className="input" />
            </div>
            <div>
              <label className="label">Cor</label>
              <div className="flex gap-2">
                {BOARD_COLORS.map((c) => <button key={c} onClick={() => { save(edit, { color: c }); setEdit({ ...edit, color: c }); }} className={`w-8 h-8 rounded-full border-2 ${edit.color === c ? "border-paper" : "border-transparent"}`} style={{ background: c }} aria-label={`Cor ${c}`} />)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={() => { save(edit, { pinned: !edit.pinned }); setEdit(null); }} className="btn btn-ghost btn-sm">{edit.pinned ? "Desafixar" : "Fixar no topo"}</button>
              <button onClick={() => duplicate(edit)} className="btn btn-ghost btn-sm"><I.copy className="w-4 h-4" /> Duplicar</button>
              <button onClick={() => remove(edit)} className="btn btn-ghost btn-sm !text-danger hover:!border-danger"><I.trash className="w-4 h-4" /> Apagar</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/** miniaturas desenhadas à mão dos modelos */
const THUMB: Record<string, string> = { pilares: "mapa", persona: "matriz", swot: "matriz", briefing: "matriz", metas: "campanha", calendario: "campanha", estrategia: "roteiro", lancamento: "roteiro", data: "roteiro" };
function TemplateThumb({ k: key }: { k: string }) {
  const k = THUMB[key] || key;
  const c = "var(--color-mint)";
  return (
    <svg viewBox="0 0 120 64" className="h-16 w-full rounded-lg bg-panel2 border border-line">
      {k === "mapa" && (<g stroke="#8a8f94" strokeWidth="1.2" fill="none">{[[20, 14], [100, 14], [14, 50], [106, 50], [60, 8], [60, 56]].map(([x, y], i) => <g key={i}><path d={`M60 32 L${x} ${y}`} /><rect x={x - 9} y={y - 4} width="18" height="8" rx="3" fill="#1c1c1f" /></g>)}<ellipse cx="60" cy="32" rx="14" ry="8" fill={c} stroke="none" /></g>)}
      {k === "matriz" && (<g>{[[8, 6, "#b2f2bb"], [62, 6, "#a5d8ff"], [8, 34, "#ffec99"], [62, 34, "#ffc9c9"]].map(([x, y, f], i) => <rect key={i} x={x as number} y={y as number} width="50" height="24" rx="3" fill={f as string} opacity=".55" />)}</g>)}
      {k === "roteiro" && (<g>{[0, 1, 2, 3, 4].map((i) => <g key={i}><rect x={6 + i * 23} y="18" width="17" height="10" rx="2" fill={i === 0 ? c : "#a5d8ff"} opacity=".8" /><rect x={8 + i * 23} y="36" width="13" height="13" rx="1" fill="#ffec99" opacity=".7" />{i < 4 && <path d={`M${23 + i * 23} 23h6`} stroke="#8a8f94" />}</g>)}</g>)}
      {k === "funil" && (<g>{[[10, 100, "#a5d8ff"], [25, 70, "#b2f2bb"], [40, 40, "#ffd8a8"]].map(([x, w, f], i) => <rect key={i} x={x as number} y={6 + i * 18} width={w as number} height="15" rx="2" fill={f as string} opacity=".6" />)}</g>)}
      {k === "campanha" && (<g>{[["#a5d8ff", 8], ["#b2f2bb", 44], ["#ffd8a8", 80]].map(([f, x], i) => <g key={i}><rect x={x as number} y="6" width="32" height="52" rx="3" fill="none" stroke={f as string} /><rect x={(x as number) + 6} y="16" width="20" height="14" rx="1" fill="#ffec99" opacity=".7" /><rect x={(x as number) + 6} y="36" width="20" height="14" rx="1" fill="#fcc2d7" opacity=".7" /></g>)}</g>)}
    </svg>
  );
}
