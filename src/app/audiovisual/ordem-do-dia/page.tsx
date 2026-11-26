"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import Modal from "@/components/agency/Modal";
import { I } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_CHECKLIST = [
  "Baterias carregadas (câmera, lapela e luz)",
  "Cartões de memória formatados e com espaço",
  "Lentes e sensor limpos",
  "Teste de áudio feito",
  "Balanço de branco e exposição conferidos",
  "Roteiro aberto no teleprompter",
  "Autorização de uso de imagem assinada",
  "Backup dos arquivos antes de sair do set",
];
type Member = { name: string; role?: string; phone?: string; call?: string };
type Check = { t: string; done?: boolean };
const today = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");
const empty = () => ({ id: null as string | null, title: "", date: today(), call_time: "08:00", wrap_time: "12:00", location: "", address: "", client_id: "", content_ids: [] as string[], team: [] as Member[], equipment_ids: [] as string[], checklist: [] as Check[], notes: "" });

export default function OrdemDoDia() {
  const [shoots, setShoots] = useState<any[] | null>(null);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [equip, setEquip] = useState<any[]>([]);
  const [shotCount, setShotCount] = useState<Record<string, { n: number; done: number }>>({});
  const [template, setTemplate] = useState<string[]>(DEFAULT_CHECKLIST);
  const [form, setForm] = useState<ReturnType<typeof empty> | null>(null);
  const [saving, setSaving] = useState(false);
  const [past, setPast] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplText, setTplText] = useState("");

  const load = useCallback(async () => {
    const s = createClient();
    const [{ data: sh }, { data: ci }, { data: cl }, { data: tm }, { data: eq }, { data: shots }, { data: cfg }] = await Promise.all([
      s.from("av_shoots").select("*").order("date").order("call_time"),
      s.from("content_ideas").select("id,title,format,record_date,client_id,body").is("archived_at", null).order("record_date", { ascending: true, nullsFirst: false }).limit(500),
      s.from("ag_clients").select("id,name").order("name"),
      s.from("ag_team").select("id,name,role,phone,active").order("name"),
      s.from("ag_equipment").select("id,name,category,status").order("name"),
      s.from("av_shots").select("content_id,done"),
      s.from("av_settings").select("checklist_template").maybeSingle(),
    ]);
    setShoots(sh || []); setIdeas(ci || []); setClients(cl || []); setTeam((tm || []).filter((t: any) => t.active !== false)); setEquip(eq || []);
    const c: Record<string, { n: number; done: number }> = {};
    (shots || []).forEach((x: any) => { c[x.content_id] = c[x.content_id] || { n: 0, done: 0 }; c[x.content_id].n++; if (x.done) c[x.content_id].done++; });
    setShotCount(c);
    if (Array.isArray(cfg?.checklist_template) && cfg.checklist_template.length) setTemplate(cfg.checklist_template);
  }, []);
  useEffect(() => { load(); }, [load]);

  const t0 = today();
  const upcoming = (shoots || []).filter((s) => s.date >= t0);
  const old = (shoots || []).filter((s) => s.date < t0).reverse();
  const idea = (id: string) => ideas.find((i) => i.id === id);
  const cname = (id?: string | null) => clients.find((c) => c.id === id)?.name;

  function newShoot() {
    const f = empty();
    f.checklist = template.map((t) => ({ t, done: false }));
    setForm(f);
  }
  function edit(s: any) {
    setForm({ id: s.id, title: s.title, date: s.date, call_time: hhmm(s.call_time), wrap_time: hhmm(s.wrap_time), location: s.location || "", address: s.address || "", client_id: s.client_id || "", content_ids: s.content_ids || [], team: s.team || [], equipment_ids: s.equipment_ids || [], checklist: s.checklist || [], notes: s.notes || "" });
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    const s = createClient();
    const row = {
      title: form.title.trim() || `Gravação ${cname(form.client_id) || ""}`.trim(),
      date: form.date, call_time: form.call_time || null, wrap_time: form.wrap_time || null,
      location: form.location || null, address: form.address || null, client_id: form.client_id || null,
      content_ids: form.content_ids, team: form.team.filter((m) => m.name.trim()), equipment_ids: form.equipment_ids,
      checklist: form.checklist.filter((c) => c.t.trim()), notes: form.notes || null, updated_at: new Date().toISOString(),
    };
    const { data, error } = form.id ? await s.from("av_shoots").update(row).eq("id", form.id).select().single() : await s.from("av_shoots").insert(row).select().single();
    // a data da diária vira a data de gravação dos conteúdos
    if (!error && form.content_ids.length) await s.from("content_ideas").update({ record_date: form.date }).in("id", form.content_ids);
    // se já está na Agenda, atualiza o compromisso
    if (!error && data?.event_id) await syncEvent(data);
    setSaving(false);
    if (error) { setMsg(error.message); return; }
    setForm(null); load();
  }

  function eventRow(sh: any) {
    const start = `${sh.date}T${hhmm(sh.call_time) || "09:00"}:00-03:00`;
    const end = sh.wrap_time ? `${sh.date}T${hhmm(sh.wrap_time)}:00-03:00` : new Date(new Date(start).getTime() + 4 * 3600e3).toISOString();
    const items = (sh.content_ids || []).map((id: string) => idea(id)?.title).filter(Boolean);
    return { title: sh.title, kind: "captacao", starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString(), location: [sh.location, sh.address].filter(Boolean).join(" · ") || null, client_id: sh.client_id || null, notes: `Ordem do dia no HUB.${items.length ? `\nConteúdos: ${items.join("; ")}` : ""}${sh.notes ? `\n${sh.notes}` : ""}` };
  }
  async function syncEvent(sh: any) {
    const s = createClient();
    let id = sh.event_id;
    if (id) await s.from("ag_events").update(eventRow(sh)).eq("id", id);
    else {
      const { data } = await s.from("ag_events").insert(eventRow(sh)).select("id").single();
      id = data?.id;
      if (id) await s.from("av_shoots").update({ event_id: id }).eq("id", sh.id);
    }
    if (id) fetch("/api/google/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_id: id }) }).catch(() => null);
    return id;
  }
  async function toAgenda(sh: any) { await syncEvent(sh); setMsg(`"${sh.title}" está na Agenda${sh.event_id ? " (atualizado)" : ""}.`); load(); }

  async function share(sh: any) {
    let token = sh.share_token;
    if (!token) {
      token = crypto.randomUUID();
      await createClient().from("av_shoots").update({ share_token: token }).eq("id", sh.id);
      load();
    }
    const url = `${window.location.origin}/r/set/${token}`;
    try { await navigator.clipboard.writeText(url); setMsg("Link da ordem do dia copiado. Mande para a equipe: abre no celular sem login."); } catch { setMsg(url); }
  }
  async function unshare(sh: any) { await createClient().from("av_shoots").update({ share_token: null }).eq("id", sh.id); setMsg("Link desativado."); load(); }
  async function remove(sh: any) {
    if (armed !== sh.id) { setArmed(sh.id); setTimeout(() => setArmed(null), 5000); return; }
    await createClient().from("av_shoots").delete().eq("id", sh.id);
    setArmed(null); load();
  }
  async function toggleCheck(sh: any, i: number) {
    const checklist = (sh.checklist || []).map((c: Check, k: number) => (k === i ? { ...c, done: !c.done } : c));
    setShoots((l) => (l || []).map((x) => (x.id === sh.id ? { ...x, checklist } : x)));
    await createClient().from("av_shoots").update({ checklist }).eq("id", sh.id);
  }
  async function saveTemplate() {
    const list = tplText.split("\n").map((x) => x.trim()).filter(Boolean);
    const s = createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return;
    await s.from("av_settings").upsert({ owner_id: user.id, checklist_template: list, updated_at: new Date().toISOString() });
    setTemplate(list.length ? list : DEFAULT_CHECKLIST); setTplOpen(false);
  }

  const Card = ({ sh }: { sh: any }) => {
    const items = (sh.content_ids || []).map(idea).filter(Boolean);
    const ck = sh.checklist || [];
    const done = ck.filter((c: Check) => c.done).length;
    return (
      <div className="card p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-3 justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-widest text-mint">{fmtDate(sh.date)}{sh.call_time ? ` · ${hhmm(sh.call_time)}${sh.wrap_time ? `–${hhmm(sh.wrap_time)}` : ""}` : ""}</p>
            <h3 className="font-display font-bold text-xl mt-1">{sh.title}</h3>
            <p className="text-xs text-fog mt-0.5">{[cname(sh.client_id), sh.location, sh.address].filter(Boolean).join(" · ") || "Local a definir"}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            <button onClick={() => share(sh)} className="btn btn-mint btn-sm"><I.link className="w-3.5 h-3.5" />{sh.share_token ? "Copiar link" : "Link para a equipe"}</button>
            {sh.share_token && <a href={`/r/set/${sh.share_token}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Abrir</a>}
            <button onClick={() => toAgenda(sh)} className="btn btn-ghost btn-sm"><I.calendar className="w-3.5 h-3.5" />{sh.event_id ? "Atualizar agenda" : "Pôr na agenda"}</button>
            <button onClick={() => edit(sh)} className="btn btn-ghost btn-sm"><I.pen className="w-3.5 h-3.5" />Editar</button>
            <button onClick={() => remove(sh)} className={`btn btn-ghost btn-sm ${armed === sh.id ? "text-danger" : ""}`}>{armed === sh.id ? "Confirmar" : <I.trash className="w-3.5 h-3.5" />}</button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">Conteúdos e planos</p>
            {!items.length && <p className="text-xs text-fog">Nenhum conteúdo.</p>}
            {items.map((i: any) => { const c = shotCount[i.id]; return (
              <Link key={i.id} href={`/audiovisual/decupagem?c=${i.id}`} className="flex items-center gap-2 py-1.5 text-sm hover:text-mint">
                <span className="flex-1 truncate">{i.title}</span>
                <span className={`chip shrink-0 ${c && c.done === c.n ? "chip-mint" : ""}`}>{c ? `${c.done}/${c.n}` : "decupar"}</span>
              </Link>
            ); })}
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">Equipe e equipamento</p>
            {(sh.team || []).map((m: Member, k: number) => <p key={k} className="text-sm py-0.5">{m.name}{m.role ? <span className="text-fog"> · {m.role}</span> : ""}{m.call ? <span className="text-fog font-mono text-xs"> · {m.call}</span> : ""}</p>)}
            {!(sh.team || []).length && <p className="text-xs text-fog">Sem equipe.</p>}
            <div className="flex flex-wrap gap-1 mt-2">{(sh.equipment_ids || []).map((id: string) => { const e = equip.find((x) => x.id === id); return e ? <span key={id} className="chip">{e.name}</span> : null; })}</div>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-fog mb-2">Checklist de set · {done}/{ck.length}</p>
            {ck.map((c: Check, k: number) => (
              <button key={k} onClick={() => toggleCheck(sh, k)} className="w-full flex items-start gap-2 py-1 text-left text-sm">
                <span className={`mt-0.5 w-4 h-4 rounded border shrink-0 grid place-items-center text-[10px] ${c.done ? "bg-mint border-mint text-[var(--color-on-mint,#06140e)]" : "border-[#4a4d52]"}`}>{c.done && "✓"}</span>
                <span className={c.done ? "text-fog line-through" : ""}>{c.t}</span>
              </button>
            ))}
          </div>
        </div>
        {sh.notes && <p className="text-sm text-fog mt-3 border-t border-line pt-3 whitespace-pre-wrap">{sh.notes}</p>}
      </div>
    );
  };

  const pick = useMemo(() => {
    if (!form) return [];
    const near = (i: any) => i.record_date === form.date ? 0 : form.client_id && i.client_id === form.client_id ? 1 : i.record_date && i.record_date >= t0 ? 2 : 3;
    return [...ideas].sort((a, b) => near(a) - near(b)).slice(0, 80);
  }, [ideas, form, t0]);
  const up = (p: Partial<ReturnType<typeof empty>>) => setForm((f) => (f ? { ...f, ...p } : f));
  const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  return (
    <>
      <PageHead kicker="01 · PRÉ-PRODUÇÃO" title="Ordem do dia" desc="Cada diária de gravação com horário, local, equipe, equipamento, planos e checklist de set. A equipe abre pelo link no celular, sem login.">
        <button onClick={() => { setTplText(template.join("\n")); setTplOpen(true); }} className="btn btn-ghost">Checklist padrão</button>
        <button onClick={newShoot} className="btn btn-mint"><I.plus className="w-4 h-4" />Nova diária</button>
      </PageHead>
      {msg && <p className="text-sm text-mint mb-4 break-all">{msg}</p>}
      {!shoots && <p className="text-sm text-fog">Carregando…</p>}
      {shoots && !upcoming.length && (
        <div className="card p-8 text-center">
          <I.calendar className="w-10 h-10 mx-auto mb-3 text-fog opacity-60" />
          <p className="text-sm text-fog">Nenhuma diária marcada. Crie uma, escolha os conteúdos e mande o link para a equipe.</p>
          <button onClick={newShoot} className="btn btn-mint mt-4"><I.plus className="w-4 h-4" />Nova diária</button>
        </div>
      )}
      <div className="flex flex-col gap-4">{upcoming.map((sh) => <Card key={sh.id} sh={sh} />)}</div>
      {old.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setPast(!past)} className="text-sm text-fog hover:text-paper">{past ? "▾" : "▸"} Diárias passadas ({old.length})</button>
          {past && <div className="flex flex-col gap-4 mt-3 opacity-80">{old.map((sh) => <Card key={sh.id} sh={sh} />)}</div>}
        </div>
      )}

      <Modal open={!!form} title={form?.id ? "Editar diária" : "Nova diária"} onClose={() => setForm(null)} wide>
        {form && (
          <div className="grid gap-4">
            <div className="grid md:grid-cols-[1fr_160px] gap-3">
              <div><label className="label">Nome</label><input className="input" placeholder="Ex.: Café Raiz · 3 Reels da campanha" value={form.title} onChange={(e) => up({ title: e.target.value })} /></div>
              <div><label className="label">Data</label><input type="date" className="input" value={form.date} onChange={(e) => up({ date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="label">Chegada</label><input type="time" className="input" value={form.call_time} onChange={(e) => up({ call_time: e.target.value })} /></div>
              <div><label className="label">Fim previsto</label><input type="time" className="input" value={form.wrap_time} onChange={(e) => up({ wrap_time: e.target.value })} /></div>
              <div className="col-span-2"><label className="label">Cliente</label>
                <select className="input" value={form.client_id} onChange={(e) => up({ client_id: e.target.value })}><option value="">Sem cliente</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><label className="label">Local</label><input className="input" placeholder="Estúdio, loja, externa…" value={form.location} onChange={(e) => up({ location: e.target.value })} /></div>
              <div><label className="label">Endereço</label><input className="input" placeholder="Rua, número, bairro" value={form.address} onChange={(e) => up({ address: e.target.value })} /></div>
            </div>

            <div>
              <label className="label">Conteúdos desta diária ({form.content_ids.length})</label>
              <div className="border border-line rounded-xl max-h-52 overflow-y-auto scroll-thin divide-y divide-line">
                {pick.map((i) => (
                  <label key={i.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-panel2">
                    <input type="checkbox" className="accent-[var(--color-mint)]" checked={form.content_ids.includes(i.id)} onChange={() => up({ content_ids: toggle(form.content_ids, i.id) })} />
                    <span className="flex-1 truncate">{i.title}</span>
                    <span className="text-[11px] text-fog shrink-0">{[cname(i.client_id), shotCount[i.id] ? `${shotCount[i.id].n} planos` : i.body ? "roteiro" : ""].filter(Boolean).join(" · ")}</span>
                  </label>
                ))}
                {!pick.length && <p className="text-sm text-fog p-3">Nenhum conteúdo no Creator ainda.</p>}
              </div>
              <p className="text-[11px] text-fog mt-1">Ao salvar, a data da diária vira a data de gravação desses conteúdos no Quadro de produção.</p>
            </div>

            <div>
              <label className="label">Equipe</label>
              {team.length > 0 && <div className="flex flex-wrap gap-1.5 mb-2">{team.map((t) => {
                const on = form.team.some((m) => m.name === t.name);
                return <button key={t.id} type="button" onClick={() => up({ team: on ? form.team.filter((m) => m.name !== t.name) : [...form.team, { name: t.name, role: t.role || "", phone: t.phone || "", call: form.call_time }] })} className={`chip px-2.5 py-1 ${on ? "chip-mint" : "hover:text-paper"}`}>{t.name}{t.role ? ` · ${t.role}` : ""}</button>;
              })}</div>}
              <div className="grid gap-2">
                {form.team.map((m, k) => (
                  <div key={k} className="grid grid-cols-[1fr_1fr_90px_auto] gap-2">
                    <input className="input !py-1.5 text-sm" placeholder="Nome" value={m.name} onChange={(e) => up({ team: form.team.map((x, j) => (j === k ? { ...x, name: e.target.value } : x)) })} />
                    <input className="input !py-1.5 text-sm" placeholder="Função" value={m.role || ""} onChange={(e) => up({ team: form.team.map((x, j) => (j === k ? { ...x, role: e.target.value } : x)) })} />
                    <input type="time" className="input !py-1.5 text-sm" value={m.call || ""} onChange={(e) => up({ team: form.team.map((x, j) => (j === k ? { ...x, call: e.target.value } : x)) })} />
                    <button type="button" onClick={() => up({ team: form.team.filter((_, j) => j !== k) })} className="text-fog hover:text-danger px-1"><I.trash className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => up({ team: [...form.team, { name: "", role: "", call: form.call_time }] })} className="text-xs text-fog hover:text-paper text-left">+ Pessoa (modelo, apresentador, freela…)</button>
              </div>
            </div>

            <div>
              <label className="label">Equipamento</label>
              {!equip.length && <p className="text-xs text-fog">Cadastre os equipamentos em <Link href="/agency/equipamentos" className="text-mint underline">Gestor › Equipamentos</Link>.</p>}
              <div className="flex flex-wrap gap-1.5">{equip.map((e) => (
                <button key={e.id} type="button" onClick={() => up({ equipment_ids: toggle(form.equipment_ids, e.id) })} className={`chip px-2.5 py-1 ${form.equipment_ids.includes(e.id) ? "chip-mint" : "hover:text-paper"}`}>{e.name}</button>
              ))}</div>
            </div>

            <div>
              <label className="label">Checklist de set</label>
              <div className="grid gap-1.5">
                {form.checklist.map((c, k) => (
                  <div key={k} className="flex gap-2">
                    <input className="input !py-1.5 text-sm" value={c.t} onChange={(e) => up({ checklist: form.checklist.map((x, j) => (j === k ? { ...x, t: e.target.value } : x)) })} />
                    <button type="button" onClick={() => up({ checklist: form.checklist.filter((_, j) => j !== k) })} className="text-fog hover:text-danger px-1"><I.trash className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => up({ checklist: [...form.checklist, { t: "", done: false }] })} className="text-xs text-fog hover:text-paper text-left">+ Item</button>
              </div>
            </div>

            <div><label className="label">Observações para a equipe</label><textarea className="input min-h-[70px]" placeholder="Figurino, estacionamento, contato no local…" value={form.notes} onChange={(e) => up({ notes: e.target.value })} /></div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setForm(null)} className="btn btn-ghost">Cancelar</button>
              <button onClick={save} disabled={saving || !form.date} className="btn btn-mint">{saving ? "Salvando…" : "Salvar diária"}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={tplOpen} title="Checklist padrão de set" onClose={() => setTplOpen(false)}>
        <p className="text-sm text-fog mb-3">Um item por linha. Toda nova diária começa com esta lista; dá para ajustar em cada uma.</p>
        <textarea className="input min-h-[260px]" value={tplText} onChange={(e) => setTplText(e.target.value)} />
        <div className="flex gap-2 justify-between mt-3">
          <button onClick={() => setTplText(DEFAULT_CHECKLIST.join("\n"))} className="btn btn-ghost btn-sm">Voltar ao padrão</button>
          <button onClick={saveTemplate} className="btn btn-mint btn-sm">Salvar</button>
        </div>
      </Modal>
    </>
  );
}
