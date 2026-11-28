/* Catálogo da Biblioteca de LUTs (/audiovisual/luts).
 * "Do HUB" = a LUT é calculada pelo HUB (src/lib/luts/core.ts) e baixa como .cube na hora; é nossa, pode usar e repassar.
 * "Oficial" e "Grátis de fora" = só o link para a página de quem fez, porque a licença não deixa (ou não diz que deixa) hospedar o arquivo.
 * Licenças conferidas em 28/11/2026. */

export type Camera = {
  id: string; // id do perfil em LOG_PROFILES (core.ts) ou "" quando o HUB não converte
  marca: string;
  perfil: string;
  cameras: string;
  dica?: string;
  oficial?: { label: string; url: string; nota: string };
};

export const CAMERAS: Camera[] = [
  {
    id: "bmdfilm5", marca: "Blackmagic", perfil: "Blackmagic Film Gen 5 · Wide Gamut", cameras: "Pocket 4K/6K, Cinema Camera 6K, URSA, PYXIS",
    dica: "No app Blackmagic Camera do iPhone, o log gravado é o Apple Log: use a linha da Apple.",
    oficial: { label: "LUTs da Blackmagic (vêm no DaVinci Resolve grátis)", url: "https://www.blackmagicdesign.com/products/davinciresolve", nota: "Grátis. Instale o DaVinci Resolve e, em Configurações do projeto › Gerenciamento de cor, clique em Abrir pasta de LUTs: as \"Blackmagic Design\" estão lá. Uso nos seus vídeos liberado; a licença não diz que pode repassar os arquivos, por isso o HUB só aponta o caminho." },
  },
  {
    id: "applelog", marca: "Apple", perfil: "Apple Log · Rec.2020", cameras: "iPhone 15 Pro em diante (app Câmera ou Blackmagic Camera)",
    dica: "Apple Log 2 (iPhone 17 Pro) usa um gamut mais largo: prefira a LUT oficial ou a do app Blackmagic Camera.",
    oficial: { label: "Exportar \"Apple Log to Rec709\" do app Blackmagic Camera", url: "https://apps.apple.com/app/blackmagic-camera/id6449580241", nota: "Grátis. No app: Ajustes › LUTs › Seleção de LUT › Exportar LUT; o arquivo vai para o app Arquivos. A Apple também publica a LUT no portal de desenvolvedores (pede login). Sem licença de repasse." },
  },
  {
    id: "slog3", marca: "Sony", perfil: "S-Log3 · S-Gamut3.Cine", cameras: "FX3, FX30, FX6, A7S III, A7 IV, ZV-E1, BURANO",
    oficial: { label: "Sony · Biblioteca de LUTs", url: "https://pro.sony/ue_US/technology/professional-video-lut-look-up-table", nota: "Grátis (\"available free of charge\"): S-Log3 para 709, s709, Look Profiles e LUTs de embaixadores. A página não fala em repasse, então o HUB só põe o link." },
  },
  {
    id: "clog3", marca: "Canon", perfil: "Canon Log 3 · Cinema Gamut", cameras: "R5 C, R6 II, R7, C70, C300 III",
    oficial: { label: "Canon 3D LUT para Canon 709 (C-Log 2/3)", url: "https://asia.canon/en/support/0200747702", nota: "Grátis no suporte da Canon (também há a versão CMT para monitor). Sem licença de repasse." },
  },
  {
    id: "vlog", marca: "Panasonic", perfil: "V-Log · V-Gamut", cameras: "LUMIX S5 II, GH6, GH7, S1H, BGH1",
    oficial: { label: "Panasonic · LUT V-Log para V-709", url: "https://av.jpn.support.panasonic.com/support/global/cs/dsc/download/lut/index.html", nota: "Grátis. Os termos do site pedem autorização para repassar o conteúdo, por isso fica o link." },
  },
  {
    id: "flog2", marca: "Fujifilm", perfil: "F-Log2 · F-Gamut", cameras: "X-H2S, X-H2, X-T5, X-S20, GFX",
    oficial: { label: "Fujifilm · LUT para F-Log / F-Log2", url: "https://www.fujifilm-x.com/en-gb/support/download/lut/", nota: "Grátis, um .zip com .cube por câmera (inclui simulações de filme como ETERNA). Sem licença de repasse." },
  },
  {
    id: "flog", marca: "Fujifilm", perfil: "F-Log (original) · F-Gamut", cameras: "X-T3, X-T4, X-H1, X-S10",
    oficial: { label: "Fujifilm · LUT para F-Log", url: "https://www.fujifilm-x.com/en-gb/support/download/lut/", nota: "Mesma página da F-Log2." },
  },
  {
    id: "nlog", marca: "Nikon", perfil: "N-Log · Rec.2020", cameras: "Z6 III, Z8, Z9, Zf",
    oficial: { label: "Nikon · LUTs N-Log (inclui as feitas com a RED)", url: "https://nikon.co.uk/en_GB/products/red-n-log-luts", nota: "Grátis; a LUT N-Log padrão fica no centro de downloads da Nikon, na página do seu modelo. Sem licença de repasse." },
  },
  {
    id: "dlog", marca: "DJI", perfil: "D-Log (clássico) · D-Gamut", cameras: "Inspire, Zenmuse X5/X7/X9, Ronin 4D",
    oficial: { label: "DJI · LUTs oficiais", url: "https://www.dji.com/lut", nota: "Grátis. A página não fala em repasse." },
  },
  {
    id: "", marca: "DJI", perfil: "D-Log M", cameras: "Osmo Pocket 3, Mini 4 Pro, Air 3, Mavic 3, Osmo Action",
    dica: "A curva do D-Log M não é publicada pela DJI, então o HUB não converte: baixe a oficial e use os estilos do HUB depois dela.",
    oficial: { label: "DJI · \"D-Log M to Rec.709\" por modelo", url: "https://www.dji.com/lut", nota: "Grátis, um arquivo por modelo. A página não fala em repasse." },
  },
];

export type Estilo = { id: string; nome: string; desc: string; grupo: "VINCIT" | "Editor"; uso: string; editorLook?: string };

export const ESTILOS: Estilo[] = [
  { id: "comercial", nome: "Comercial limpo", grupo: "VINCIT", desc: "Contraste leve e cor viva sem estourar a pele.", uso: "Produto, e-commerce, ISYS no dia a dia" },
  { id: "teal-laranja", nome: "Teal & laranja", grupo: "VINCIT", desc: "Sombras azul-petróleo e pele laranja, o visual de cinema.", uso: "Vlog, viagem, abertura" },
  { id: "kodak-quente", nome: "Filme quente", grupo: "VINCIT", desc: "Inspirado em negativo colorido quente: verdes amarelados, pretos macios.", uso: "Lifestyle, arrume-se comigo" },
  { id: "fuji-verde", nome: "Filme verde", grupo: "VINCIT", desc: "Verdes puxados para o ciano e cor contida, de filme japonês.", uso: "Rua, natureza, documental" },
  { id: "dourado", nome: "Hora dourada", grupo: "VINCIT", desc: "Luz de fim de tarde: altas luzes douradas e pele quente.", uso: "Externa, editorial de moda" },
  { id: "natal", nome: "Natal", grupo: "VINCIT", desc: "Vermelho mais vivo, brilho dourado e sombras fundas.", uso: "Campanha de Natal ISYS" },
  { id: "pastel", nome: "Pastel de moda", grupo: "VINCIT", desc: "Clara, pouco contraste e cor suave.", uso: "Lookbook, provador, flat lay" },
  { id: "matte", nome: "Matte desbotado", grupo: "VINCIT", desc: "Pretos levantados e cor baixa, ar de revista.", uso: "Reels estéticos, montagem" },
  { id: "vintage-70", nome: "Vintage anos 70", grupo: "VINCIT", desc: "Sépia leve, sombras esverdeadas e desbotado.", uso: "Memória, bastidor, retrô" },
  { id: "bleach", nome: "Bleach bypass", grupo: "VINCIT", desc: "Pouca cor e muito contraste, áspero.", uso: "Esporte, treino, impacto" },
  { id: "thriller", nome: "Thriller frio", grupo: "VINCIT", desc: "Tudo puxado para o ciano, cor baixa e contraste alto.", uso: "Tensão, cidade à noite" },
  { id: "noite-azul", nome: "Noite azul", grupo: "VINCIT", desc: "Escura e azulada, como noite americana.", uso: "Cenas noturnas, clima" },
  { id: "noir", nome: "Noir P&B", grupo: "VINCIT", desc: "Preto e branco duro, com filtro vermelho na pele.", uso: "Frase de impacto, retrato" },
  { id: "pb-suave", nome: "P&B suave", grupo: "VINCIT", desc: "Preto e branco de baixo contraste, elegante.", uso: "Editorial, depoimento" },
  { id: "editor-quente", nome: "Quente (Editor)", grupo: "Editor", desc: "O look Quente do Editor do HUB, igualzinho.", uso: "Mesma cor no Editor e no Premiere", editorLook: "quente" },
  { id: "editor-frio", nome: "Frio (Editor)", grupo: "Editor", desc: "O look Frio do Editor do HUB.", uso: "Mesma cor no Editor e no Premiere", editorLook: "frio" },
  { id: "editor-contraste", nome: "Contraste alto (Editor)", grupo: "Editor", desc: "O look Contraste alto do Editor do HUB.", uso: "Mesma cor no Editor e no Premiere", editorLook: "contraste" },
  { id: "editor-filme", nome: "Filme (Editor)", grupo: "Editor", desc: "A cor do look Filme do Editor. Grão e vinheta não cabem numa LUT: no Premiere, use Lumetri › Vinheta e um grão por cima.", uso: "Mesma cor no Editor e no Premiere", editorLook: "filme" },
  { id: "editor-pb", nome: "Preto e branco (Editor)", grupo: "Editor", desc: "O look Preto e branco do Editor do HUB.", uso: "Mesma cor no Editor e no Premiere", editorLook: "pb" },
];

/** pacotes grátis de fora, só com link (o HUB não hospeda) */
export type Pacote = { nome: string; url: string; licenca: string; comercial: boolean; repasse: string; conteudo: string };
export const PACOTES: Pacote[] = [
  { nome: "OpenLUTs (darkyboys)", url: "https://github.com/darkyboys/openluts", licenca: "CC0 (domínio público)", comercial: true, repasse: "Livre", conteudo: "14 LUTs: S-Log3 para Rec.709 e estilos como Teal & Orange" },
  { nome: "Clean Commercial (Daedal)", url: "https://daedal.art/resources/clean-commercial-pack/", licenca: "CC0", comercial: true, repasse: "Livre", conteudo: "8 estilos limpos para comercial, sobre Rec.709" },
  { nome: "Editor Hub · LUTs grátis", url: "https://editor-hub.com/assets/luts", licenca: "CC0 e MIT (por grupo)", comercial: true, repasse: "Originais CC0; 4 pacotes externos marcados \"no redistribution\"", conteudo: "70 LUTs: blockbuster, filmes (Portra, 2383, Velvia), P&B, lo-fi" },
  { nome: "slay LUTs", url: "https://github.com/slaycamera/luts", licenca: "CC BY 4.0", comercial: true, repasse: "Com crédito a \"slay\"; não vender os arquivos", conteudo: "5 estilos: Amber, Fade, Neon, Film, Portrait" },
  { nome: "Sony · Look Profiles e Technicolor", url: "https://pro.sony/ue_US/technology/professional-video-lut-look-up-table", licenca: "Grátis da Sony", comercial: true, repasse: "Não diz; só link", conteudo: "Looks da BURANO (Warm, Cool, Vintage, Teal and Orange) e coleção Technicolor, para S-Log3" },
  { nome: "Fujifilm · simulações de filme", url: "https://www.fujifilm-x.com/en-gb/support/download/lut/", licenca: "Grátis da Fujifilm", comercial: true, repasse: "Não diz; só link", conteudo: "ETERNA, Classic Chrome e outras para F-Log/F-Log2" },
];
