"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { briefingProgress } from "@/lib/briefing";
import { kitComMarca } from "@/lib/kitMarca";
import { I } from "@/components/icons";

/**
 * Ficha do perfil (28/11, aprovado pelo Vinícius): Perfis & marca é o centro de cada perfil.
 * Cada aba segue o fluxo (plano → marca → conteúdo → gravar e editar → resultado) e só MOSTRA e LIGA
 * o que já existe em outras telas. Nada é copiado: o atalho abre o lugar onde a coisa é editada.
 */
export type Aba = "plano" | "marca" | "conteudo" | "gravar" | "resultado";
export const ABAS: [Aba, string][] = [["plano", "Plano"], ["marca", "Marca"], ["conteudo", "Conteúdo"], ["gravar", "Gravar e editar"], ["resultado", "Resultado"]];

type Dados = {
  diag: any | null; entrevista: any | null; loja: any | null; acoes: any[];
  marca: any | null; kit: any | null;
  cards: { ativos: number; publicados: number; proximos: any[] };
  estilos: any[]; motions: number; fotos: number; midia: number;
};

const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const dia = (d?: string | null) => (d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "");

export function AbasPerfil({ aba, setAba }: { aba: Aba; setAba: (a: Aba) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scroll-thin -mx-1 px-1 pb-1 mb-5">
      {ABAS.map(([k, l], i) => (
        <button key={k} onClick={() => setAba(k)} className={`chip whitespace-nowrap ${aba === k ? "chip-mint" : "hover:text-paper"}`}>
          <span className="font-mono text-[10px] opacity-70 mr-1">{i + 1}</span>{l}
        </button>
      ))}
    </div>
  );
}

function Linha({ href, titulo, sub, fim, children }: { href: string; titulo: string; sub?: React.ReactNode; fim?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Link href={href} className="card px-4 py-3.5 flex items-center gap-3 hover:border-mint-dim transition-colors min-w-0">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[15px] truncate">{titulo}</p>
        {sub && <div className="text-xs text-fog mt-0.5 truncate">{sub}</div>}
        {children}
      </div>
      {fim && <div className="shrink-0 text-xs text-mint font-mono">{fim}</div>}
      <I.arrow className="w-4 h-4 text-fog shrink-0" />
    </Link>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <p className="font-mono text-[11px] text-mint tracking-widest uppercase mb-2">{titulo}</p>
      <div className="grid md:grid-cols-2 gap-2">{children}</div>
    </section>
  );
}

export default function FichaPerfil({ aba, acc, marcaEVoz, cadastro }: { aba: Exclude<Aba, "resultado">; acc: any; marcaEVoz: React.ReactNode; cadastro: React.ReactNode }) {
  const [d, setD] = useState<Dados | null>(null);
  const id = acc.id as string;

  useEffect(() => {
    (async () => {
      const s = createClient();
      const n = (r: any) => r.count || 0;
      const [diag, ent, loja, marcas, kits, cards, publicados, proximos, estilos, motions, fotos, midia] = await Promise.all([
        s.from("profile_diagnoses").select("id,created_at,result").eq("account_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        s.from("brand_interviews").select("id,status,updated_at").eq("account_id", id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        s.from("ec_stores").select("id,name").eq("account_id", id).limit(1).maybeSingle(),
        s.from("design_projects").select("id,title,data,share_token").eq("kind", "marca").is("archived_at", null).eq("data->>perfil_id", id).limit(1),
        s.from("av_style_kits").select("id,name,data").eq("account_id", id).order("updated_at", { ascending: false }),
        s.from("content_ideas").select("id", { count: "exact", head: true }).eq("account_id", id).is("archived_at", null).is("post_url", null).neq("kind", "diagnostico"),
        s.from("content_ideas").select("id", { count: "exact", head: true }).eq("account_id", id).not("post_url", "is", null),
        s.from("content_ideas").select("id,title,planned_for").eq("account_id", id).is("archived_at", null).is("post_url", null).gte("planned_for", hoje()).order("planned_for").limit(3),
        s.from("ref_estilos").select("id,name,folha_at").eq("account_id", id).order("updated_at", { ascending: false }),
        s.from("av_motions").select("id", { count: "exact", head: true }).eq("account_id", id),
        s.from("av_fotos").select("id", { count: "exact", head: true }).eq("account_id", id),
        acc.client_id ? s.from("av_media").select("id", { count: "exact", head: true }).eq("client_id", acc.client_id).eq("missing", false) : Promise.resolve({ count: 0 }),
      ]);
      const marca = (marcas.data as any[])?.[0] || null;
      // o kit ligado à marca vem primeiro (é o que o Editor usa para este perfil)
      const ks = (kits.data as any[]) || [];
      const k0 = (marca?.data?.kit_id && ks.find((k) => k.id === marca.data.kit_id)) || ks[0] || null;
      const kit = k0 ? kitComMarca(k0, marca?.data?.kit_id === k0.id ? marca : null) : null;
      const { data: acoes } = loja.data ? await s.from("ec_actions").select("id,title,date,end_date,campaign").eq("store_id", (loja.data as any).id).or(`end_date.gte.${hoje()},date.gte.${hoje()}`).order("date").limit(3) : { data: [] };
      setD({
        diag: diag.data, entrevista: ent.data, loja: loja.data, acoes: (acoes as any[]) || [], marca, kit,
        cards: { ativos: n(cards), publicados: n(publicados), proximos: (proximos.data as any[]) || [] },
        estilos: (estilos.data as any[]) || [], motions: n(motions), fotos: n(fotos), midia: n(midia),
      });
    })();
  }, [id, acc.client_id]);

  if (!d) return <p className="text-sm text-fog">Carregando a ficha…</p>;
  const bp = briefingProgress(acc.briefing);
  const notas = (d.diag?.result?.eixos || []).map((e: any) => e.nota).filter((x: any) => typeof x === "number");
  const media = notas.length ? Math.round((notas.reduce((a: number, b: number) => a + b, 0) / notas.length) * 10) / 10 : null;
  const pal: any[] = d.marca?.data?.palette || [];
  const cores = (c?: any) => <div className="flex gap-1 mt-1.5">{["destaque", "texto", "fundo"].map((k) => <span key={k} className="w-5 h-5 rounded-md border border-line" style={{ background: c?.[k] }} />)}</div>;

  if (aba === "plano") return (
    <>
      <Bloco titulo="1 · Plano">
        <Linha href={`/creator/perfis?tab=briefing&perfil=${id}`} titulo="Briefing" sub="Negócio, público, manifesto e direção" fim={`${bp}%`}>
          <div className="h-1 bg-panel2 rounded-full overflow-hidden mt-2"><div className="h-full bg-mint" style={{ width: `${bp}%` }} /></div>
        </Linha>
        <Linha href={`/creator/diagnostico?perfil=${id}`} titulo="Raio-X e estratégia" sub={d.diag ? `Último em ${dia(d.diag.created_at)}` : "Ainda não feito"} fim={media != null ? `${media}/10` : "fazer"} />
        <Linha href={`/creator/entrevista?perfil=${id}`} titulo="Entrevista de marca" sub={d.entrevista ? (d.entrevista.status === "concluida" ? "Concluída" : "Em andamento") : "Por voz, uma pergunta por vez"} />
        {d.loja ? (
          <Linha href="/ecommerce" titulo={`Loja ${d.loja.name}`} sub={d.acoes.length ? `${d.acoes.length} ação(ões) pela frente` : "Sem ação marcada"} fim="E-commerce" />
        ) : (
          <Linha href="/ecommerce" titulo="Loja" sub="Nenhuma ligada. Ligue em E-commerce › Perfil da loja" />
        )}
        {d.acoes.map((a) => (
          <Linha key={a.id} href={`/ecommerce/acoes/campanha?id=${a.id}`} titulo={`Campanha: ${a.title}`} sub={`${dia(a.date)}${a.end_date && a.end_date !== a.date ? ` a ${dia(a.end_date)}` : ""}`} fim={a.campaign?.pauta?.length ? `${a.campaign.pauta.length} peças` : undefined} />
        ))}
      </Bloco>
      {cadastro}
    </>
  );

  if (aba === "marca") return (
    <>
      <Bloco titulo="2 · Marca">
        {d.marca ? (
          <Linha href={`/design/marcas/${d.marca.id}?etapa=manual`} titulo={`Manual de marca · ${d.marca.title}`} sub={[d.marca.data?.type?.title, d.marca.data?.type?.body].filter(Boolean).join(" + ") || "Design"}>
            <div className="flex gap-1 mt-1.5">{pal.slice(0, 6).map((p, i) => <span key={i} className="w-5 h-5 rounded-md border border-line" style={{ background: p.hex }} title={p.name || p.role} />)}</div>
          </Linha>
        ) : (
          <Linha href="/design/marcas" titulo="Manual de marca" sub="Nenhuma marca do Design ligada. Ligue na etapa Manual da marca" />
        )}
        {d.marca?.share_token && <Linha href={`/m/${d.marca.share_token}`} titulo="Link do manual para o cliente" sub="Leitor público, abre no celular" />}
      </Bloco>
      {marcaEVoz}
    </>
  );

  if (aba === "conteudo") return (
    <>
      <Bloco titulo="3 · Conteúdo">
        <Linha href={`/creator/producao?perfil=${id}`} titulo="Quadro de produção" sub={`${d.cards.ativos} em produção · ${d.cards.publicados} publicados`} />
        <Linha href={`/creator/pauta?perfil=${id}`} titulo="Calendário" sub={d.cards.proximos.length ? d.cards.proximos.map((c) => `${dia(c.planned_for)} ${c.title}`).join(" · ") : "Nada marcado daqui para frente"} />
        <Linha href="/creator/referencias?tab=posts" titulo="Estilos de referência" sub={d.estilos.length ? d.estilos.map((e) => e.name).join(", ") : "Nenhum deste perfil ainda"} fim={d.estilos.length ? String(d.estilos.length) : undefined} />
        <Linha href="/creator/laboratorio" titulo="Laboratório" sub="Ideias, formatos e copy com o briefing do perfil" />
      </Bloco>
      <p className="text-xs text-fog">O gerador de Referências continua fora da ficha: é repertório amplo, de vários perfis.</p>
    </>
  );

  return (
    <>
      <Bloco titulo="4 · Gravar e editar">
        {d.kit ? (
          <Linha href={`/audiovisual/kit?kit=${d.kit.id}`} titulo={`Kit de estilo · ${d.kit.name}`} sub={d.kit.marca ? `Cores e fonte da marca ${d.kit.marca.title}, ao vivo` : "Cores próprias do kit"}>{cores(d.kit.data?.cores)}</Linha>
        ) : (
          <Linha href="/audiovisual/kit" titulo="Kit de estilo" sub="Nenhum kit deste perfil ainda" />
        )}
        <Linha href={`/audiovisual/motion?perfil=${id}`} titulo="Motions" sub="Vinhetas, aberturas e peças do perfil" fim={String(d.motions)} />
        <Linha href="/audiovisual/fotos" titulo="Fotos" sub="Editor de fotos com os estilos" fim={String(d.fotos)} />
        <Linha href={acc.client_id ? `/audiovisual/midia?cliente=${acc.client_id}` : "/audiovisual/midia"} titulo="Mídia no Drive" sub={acc.client_id ? "Arquivos nas pastas deste perfil" : "Perfil sem cliente: a mídia não fica separada"} fim={String(d.midia)} />
        <Linha href="/audiovisual/editor" titulo="Editor" sub="Usa o Kit deste perfil ao abrir um card dele" />
        <Linha href="/audiovisual/teleprompter" titulo="Teleprompter" sub="Para gravar no set pelo celular" />
      </Bloco>
      <p className="text-xs text-fog">As LUTs ficam no Audiovisual: são por câmera, não por perfil.</p>
    </>
  );
}
