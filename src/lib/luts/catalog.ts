/* Catálogo da Biblioteca de LUTs (/audiovisual/luts), separado por marca.
 * O HUB não hospeda nem gera arquivo: cada LUT tem uma prévia aproximada (calculada em src/lib/luts/core.ts)
 * e o link de onde baixar a original, grátis. Para conferir a original, use "Testar a LUT que baixei" na página.
 * Fontes conferidas em 28/11/2026. */

export type Fonte = { label: string; url: string };
export type Lut = {
  id: string;
  nome: string;
  /** o que a LUT espera receber: um perfil de log (ids de LOG_PROFILES) ou "" para vídeo normal (Rec.709) */
  entrada: string;
  /** estilo aplicado depois da conversão (ids de LOOK_FNS); vazio = só a conversão */
  look?: string;
  tipo: "Conversão" | "Conversão + estilo" | "Estilo" | "Filme";
  desc: string;
  onde: Fonte;
  /** como achar o arquivo dentro do link */
  passo: string;
};
export type Marca = { id: string; nome: string; resumo: string; luts: Lut[] };

const RESOLVE: Fonte = { label: "DaVinci Resolve (grátis)", url: "https://www.blackmagicdesign.com/products/davinciresolve" };
const SONY: Fonte = { label: "Sony · Biblioteca de LUTs", url: "https://pro.sony/ue_US/technology/professional-video-lut-look-up-table" };
const FUJI: Fonte = { label: "Fujifilm · LUT para F-Log", url: "https://www.fujifilm-x.com/en-gb/support/download/lut/" };
const EDITORHUB: Fonte = { label: "Editor Hub · LUTs grátis", url: "https://editor-hub.com/assets/luts" };
const PASTA_RESOLVE = "Instale o Resolve, abra Configurações do projeto › Gerenciamento de cor › Abrir pasta de LUTs";

export const MARCAS: Marca[] = [
  {
    id: "blackmagic", nome: "Blackmagic", resumo: "Conversões das câmeras Blackmagic e do app Blackmagic Camera no iPhone. Os arquivos vêm grátis dentro do DaVinci Resolve.",
    luts: [
      { id: "bmd-video", nome: "Gen 5 Film to Video", entrada: "bmdfilm5", tipo: "Conversão", desc: "A conversão padrão: contraste e cor normais de vídeo.", onde: RESOLVE, passo: `${PASTA_RESOLVE} › Blackmagic Design.` },
      { id: "bmd-extended", nome: "Gen 5 Film to Extended Video", entrada: "bmdfilm5", look: "bmd-extended", tipo: "Conversão", desc: "Guarda mais detalhe no céu e nas sombras; fica mais suave, bom para corrigir depois.", onde: RESOLVE, passo: `${PASTA_RESOLVE} › Blackmagic Design.` },
      { id: "bmd-applelog", nome: "Apple Log to Rec709 (iPhone)", entrada: "applelog", tipo: "Conversão", desc: "Para o que você grava em Apple Log, no app Câmera ou no Blackmagic Camera.", onde: { label: "App Blackmagic Camera", url: "https://apps.apple.com/app/blackmagic-camera/id6449580241" }, passo: "No app: Ajustes › LUTs › Seleção de LUT › Exportar LUT. O arquivo vai para o app Arquivos." },
    ],
  },
  {
    id: "kodak", nome: "Kodak (filme)", resumo: "Visual de película Kodak. A Kodak não publica LUTs; as grátis vêm do DaVinci Resolve e de pacotes abertos. Use depois da conversão do seu log.",
    luts: [
      { id: "kodak-2383", nome: "Kodak 2383 (cópia de cinema)", entrada: "", look: "kodak-2383", tipo: "Filme", desc: "O visual de sala de cinema: contraste forte, sombras puxadas para o azul-esverdeado e pele quente.", onde: RESOLVE, passo: `${PASTA_RESOLVE} › Film Looks › Rec709 Kodak 2383 D65.` },
      { id: "kodak-portra", nome: "Kodak Portra 400", entrada: "", look: "kodak-portra", tipo: "Filme", desc: "Pele bonita e quente, contraste macio e verdes pastel. Clássico de retrato e moda.", onde: EDITORHUB, passo: "Na seção de filmes (Film emulation), procure Portra." },
      { id: "kodak-ektar", nome: "Kodak Ektar 100", entrada: "", look: "kodak-ektar", tipo: "Filme", desc: "Cor forte e limpa, vermelhos intensos. Bom para produto e paisagem.", onde: EDITORHUB, passo: "Na seção de filmes (Film emulation), procure Ektar." },
      { id: "kodak-gold", nome: "Kodak Gold 200", entrada: "", look: "kodak-gold", tipo: "Filme", desc: "Amarelado e nostálgico, de foto de férias.", onde: EDITORHUB, passo: "Na seção de filmes (Film emulation), procure Gold." },
      { id: "kodak-vision3", nome: "Kodak Vision3 250D", entrada: "", look: "kodak-vision3", tipo: "Filme", desc: "Negativo de cinema: neutro, baixo contraste e muita latitude.", onde: EDITORHUB, passo: "Na seção de filmes (Film emulation), procure Vision3." },
    ],
  },
  {
    id: "canon", nome: "Canon", resumo: "Conversões oficiais para Canon Log 2 e 3 (R5 C, R6 II, R7, C70, C300 III).",
    luts: [
      { id: "canon-709", nome: "Canon Log 3 → Canon 709", entrada: "clog3", look: "canon-709", tipo: "Conversão", desc: "A cor Canon: pele rosada, contraste médio, pronto para publicar.", onde: { label: "Canon · 3D LUT para Canon 709", url: "https://asia.canon/en/support/0200747702" }, passo: "Baixe o .zip da página e use o arquivo do seu log (C-Log 3 ou C-Log 2)." },
      { id: "canon-bt709", nome: "Canon Log 3 → BT.709 (CMT)", entrada: "clog3", tipo: "Conversão", desc: "Conversão técnica mais neutra, feita para monitorar e para corrigir depois.", onde: { label: "Canon · 3D LUT para CMT", url: "https://asia.canon/en/support/0200711102" }, passo: "Baixe o .zip e use o arquivo BT.709 do seu log." },
    ],
  },
  {
    id: "sony", nome: "Sony", resumo: "Para S-Log3 (FX3, FX30, FX6, A7S III, A7 IV, ZV-E1, BURANO). Tudo grátis na biblioteca da Sony.",
    luts: [
      { id: "sony-s709", nome: "S-Log3 → s709", entrada: "slog3", look: "sony-s709", tipo: "Conversão", desc: "O visual da VENICE: suave, pele natural e altas luzes que não estouram.", onde: SONY, passo: "Na biblioteca, baixe o pacote s709 (ou a Signature LUT)." },
      { id: "sony-709-800", nome: "S-Log3 → 709 (800%)", entrada: "slog3", look: "sony-709-800", tipo: "Conversão", desc: "Conversão clássica de TV: mais contraste e cor mais forte.", onde: SONY, passo: "Na biblioteca, baixe o pacote 709 (800%) das LUTs da BURANO." },
      { id: "sony-warm", nome: "BURANO Warm", entrada: "slog3", look: "sony-warm", tipo: "Conversão + estilo", desc: "Quente e dourado, de fim de tarde.", onde: SONY, passo: "Na biblioteca, pacote BURANO Warm." },
      { id: "sony-cool", nome: "BURANO Cool", entrada: "slog3", look: "sony-cool", tipo: "Conversão + estilo", desc: "Frio e limpo, de cidade e tecnologia.", onde: SONY, passo: "Na biblioteca, pacote BURANO Cool." },
      { id: "sony-vintage", nome: "BURANO Vintage", entrada: "slog3", look: "sony-vintage", tipo: "Conversão + estilo", desc: "Desbotado e amarelado, de memória.", onde: SONY, passo: "Na biblioteca, pacote BURANO Vintage." },
      { id: "sony-teal", nome: "BURANO Teal and Orange", entrada: "slog3", look: "sony-teal", tipo: "Conversão + estilo", desc: "Sombras azul-petróleo e pele laranja, o visual de cinema.", onde: SONY, passo: "Na biblioteca, pacote BURANO Teal and Orange." },
    ],
  },
  {
    id: "fujifilm", nome: "Fujifilm", resumo: "Para F-Log2 e F-Log (X-H2S, X-T5, X-S20, GFX). As simulações de filme da Fuji, que muita gente usa em vídeo.",
    luts: [
      { id: "fuji-709", nome: "F-Log2 → BT.709 (WDR)", entrada: "flog2", tipo: "Conversão", desc: "A conversão neutra da Fujifilm.", onde: FUJI, passo: "Baixe o .zip do seu modelo e use o arquivo F-Log2 to WDR (BT.709)." },
      { id: "fuji-eterna", nome: "F-Log2 → ETERNA", entrada: "flog2", look: "fuji-eterna", tipo: "Conversão + estilo", desc: "O filme de cinema da Fuji: pouco contraste, cor contida e sombras azuladas.", onde: FUJI, passo: "No .zip do seu modelo, o arquivo F-Log2 to ETERNA." },
      { id: "fuji-3513", nome: "Fujifilm 3513 (cópia de cinema)", entrada: "", look: "fuji-3513", tipo: "Filme", desc: "Cópia de cinema da Fuji: contraste firme e verdes frios.", onde: RESOLVE, passo: `${PASTA_RESOLVE} › Film Looks › Rec709 Fujifilm 3513DI D65.` },
      { id: "fuji-velvia", nome: "Fuji Velvia", entrada: "", look: "fuji-velvia", tipo: "Filme", desc: "Cor saturada e contraste alto, de paisagem.", onde: EDITORHUB, passo: "Na seção de filmes (Film emulation), procure Velvia." },
      { id: "fuji-chrome", nome: "Classic Chrome (aproximação)", entrada: "", look: "fuji-chrome", tipo: "Filme", desc: "Cor apagada e sombras duras, de revista de rua.", onde: EDITORHUB, passo: "Procure Classic Chrome nos pacotes de filme; na câmera, é a simulação do próprio corpo." },
    ],
  },
  {
    id: "outras", nome: "Outras câmeras", resumo: "Conversões oficiais de Panasonic, DJI e Nikon.",
    luts: [
      { id: "panasonic-vlog", nome: "Panasonic V-Log → V-709", entrada: "vlog", tipo: "Conversão", desc: "LUMIX S5 II, GH6, GH7, S1H.", onde: { label: "Panasonic · LUT V-Log", url: "https://av.jpn.support.panasonic.com/support/global/cs/dsc/download/lut/index.html" }, passo: "Baixe o .zip VLog_to_V709." },
      { id: "dji-dlogm", nome: "DJI D-Log M → Rec.709", entrada: "dlog", tipo: "Conversão", desc: "Osmo Pocket 3, Mini 4 Pro, Air 3, Mavic 3. A prévia usa a curva D-Log clássica (a D-Log M não é publicada).", onde: { label: "DJI · LUTs oficiais", url: "https://www.dji.com/lut" }, passo: "Procure o seu modelo na lista Transcoders." },
      { id: "nikon-nlog", nome: "Nikon N-Log → BT.709", entrada: "nlog", tipo: "Conversão", desc: "Z6 III, Z8, Z9, Zf. Também há as LUTs feitas com a RED.", onde: { label: "Nikon · LUTs N-Log", url: "https://nikon.co.uk/en_GB/products/red-n-log-luts" }, passo: "Baixe a do seu modelo; a padrão fica no centro de downloads da Nikon." },
    ],
  },
  {
    id: "criativas", nome: "Criativas grátis", resumo: "Pacotes abertos com uso comercial liberado. Entram depois da conversão (sobre Rec.709).",
    luts: [
      { id: "open-teal", nome: "OpenLUTs · Teal & Orange", entrada: "", look: "teal-laranja", tipo: "Estilo", desc: "Domínio público (CC0). O pacote também tem S-Log3 para Rec.709.", onde: { label: "OpenLUTs no GitHub", url: "https://github.com/darkyboys/openluts" }, passo: "Code › Download ZIP." },
      { id: "daedal-clean", nome: "Daedal · Clean Commercial", entrada: "", look: "comercial", tipo: "Estilo", desc: "8 estilos limpos de comercial. Domínio público (CC0).", onde: { label: "Daedal · Clean Commercial", url: "https://daedal.art/resources/clean-commercial-pack/" }, passo: "Botão de download da página." },
      { id: "slay-film", nome: "slay · Film", entrada: "", look: "kodak-quente", tipo: "Estilo", desc: "5 estilos (Amber, Fade, Neon, Film, Portrait). Livre com crédito a \"slay\" (CC BY 4.0).", onde: { label: "slay LUTs no GitHub", url: "https://github.com/slaycamera/luts" }, passo: "Code › Download ZIP." },
      { id: "eh-blockbuster", nome: "Editor Hub · Blockbuster", entrada: "", look: "thriller", tipo: "Estilo", desc: "70 LUTs grátis para uso comercial (CC0 e MIT), com filmes, P&B e lo-fi.", onde: EDITORHUB, passo: "Escolha a LUT e clique em Download." },
    ],
  },
];

export const TODAS: (Lut & { marca: string })[] = MARCAS.flatMap((m) => m.luts.map((l) => ({ ...l, marca: m.nome })));
export const lutPorId = (id?: string) => TODAS.find((l) => l.id === id);

/** perfis de log que dá para escolher no Editor (para converter o vídeo) */
export const LOGS: [string, string][] = [
  ["bmdfilm5", "Blackmagic Film Gen 5"], ["applelog", "Apple Log (iPhone)"], ["slog3", "Sony S-Log3"], ["clog3", "Canon Log 3"],
  ["vlog", "Panasonic V-Log"], ["flog2", "Fujifilm F-Log2"], ["flog", "Fujifilm F-Log"], ["nlog", "Nikon N-Log"], ["dlog", "DJI D-Log"],
];
