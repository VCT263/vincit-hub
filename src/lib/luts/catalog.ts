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
  tipo: "Conversão" | "Conversão + estilo" | "Estilo" | "Filme" | "Autoral";
  desc: string;
  onde: Fonte;
  /** como achar o arquivo dentro do link */
  passo: string;
  /** LUT autoral VINCIT: o HUB gera o .cube em /api/luts/<look>.cube */
  autoral?: boolean;
  /** prévia feita com a tabela da LUT original reduzida (17³, só para ver; não é o arquivo para baixar) */
  tabela?: string;
};
export type Marca = { id: string; nome: string; resumo: string; luts: Lut[] };

const RESOLVE: Fonte = { label: "DaVinci Resolve (grátis)", url: "https://www.blackmagicdesign.com/products/davinciresolve" };
const SONY: Fonte = { label: "Sony · Biblioteca de LUTs", url: "https://pro.sony/ue_US/technology/professional-video-lut-look-up-table" };
const FUJI: Fonte = { label: "Fujifilm · LUT para F-Log", url: "https://www.fujifilm-x.com/en-gb/support/download/lut/" };
const EDITORHUB: Fonte = { label: "Editor Hub · LUTs grátis", url: "https://editor-hub.com/assets/luts" };
const BMDAPP: Fonte = { label: "App Blackmagic Camera", url: "https://apps.apple.com/app/blackmagic-camera/id6449580241" };
const PASSO_BMDAPP = "Já vem no app Blackmagic Camera (iPhone), grátis: Ajustes › LUTs. Para o Premiere, escolha a LUT e toque em Exportar LUT; o arquivo vai para o app Arquivos.";
const PASTA_RESOLVE = "Instale o Resolve, abra Configurações do projeto › Gerenciamento de cor › Abrir pasta de LUTs";

export const MARCAS: Marca[] = [
  {
    id: "blackmagic", nome: "Blackmagic", resumo: "Conversões das câmeras Blackmagic e os 11 looks do app Blackmagic Camera no iPhone (para Apple Log). Os looks do app têm prévia feita com o arquivo original; o resto vem grátis no DaVinci Resolve.",
    luts: [
      { id: "bmd-video", nome: "Gen 5 Film to Video", entrada: "bmdfilm5", tipo: "Conversão", desc: "A conversão padrão: contraste e cor normais de vídeo.", onde: RESOLVE, passo: `${PASTA_RESOLVE} › Blackmagic Design.` },
      { id: "bmd-extended", nome: "Gen 5 Film to Extended Video", entrada: "bmdfilm5", look: "bmd-extended", tipo: "Conversão", desc: "Guarda mais detalhe no céu e nas sombras; fica mais suave, bom para corrigir depois.", onde: RESOLVE, passo: `${PASTA_RESOLVE} › Blackmagic Design.` },
      { id: "bmdapp-rec709-neutral", nome: "Rec709 Neutral (app)", entrada: "applelog", tipo: "Conversão", tabela: "/luts-previa/bmd-rec709-neutral.bin", desc: "A conversão neutra do app, feita para o Apple Log 2 (iPhone 17); no Apple Log do iPhone 15 e 16 fica muito parecida. Prévia com o arquivo original.", onde: BMDAPP, passo: PASSO_BMDAPP },
      { id: "bmdapp-cinema-teal", nome: "Cinema Teal (app)", entrada: "applelog", tipo: "Conversão + estilo", tabela: "/luts-previa/bmd-cinema-teal.bin", desc: "Teal e laranja de cinema, pele quente e sombras azul-petróleo. Prévia feita com o arquivo original do app.", onde: BMDAPP, passo: PASSO_BMDAPP },
      { id: "bmdapp-vivid", nome: "Vivid (app)", entrada: "applelog", tipo: "Conversão + estilo", tabela: "/luts-previa/bmd-vivid.bin", desc: "Cor forte e contraste firme, sem mudar o tom da pele. Prévia feita com o arquivo original do app.", onde: BMDAPP, passo: PASSO_BMDAPP },
      { id: "bmdapp-nature", nome: "Nature (app)", entrada: "applelog", tipo: "Conversão + estilo", tabela: "/luts-previa/bmd-nature.bin", desc: "Verdes e céu mais vivos, luz clara. Externa e viagem. Prévia feita com o arquivo original do app.", onde: BMDAPP, passo: PASSO_BMDAPP },
      { id: "bmdapp-warm-fade", nome: "Warm Fade (app)", entrada: "applelog", tipo: "Conversão + estilo", tabela: "/luts-previa/bmd-warm-fade.bin", desc: "Quente e desbotado, pretos levantados. Prévia feita com o arquivo original do app.", onde: BMDAPP, passo: PASSO_BMDAPP },
      { id: "bmdapp-nostalgic", nome: "Nostalgic (app)", entrada: "applelog", tipo: "Conversão + estilo", tabela: "/luts-previa/bmd-nostalgic.bin", desc: "Ar de memória: quente, magenta nas luzes, contraste baixo. Prévia feita com o arquivo original do app.", onde: BMDAPP, passo: PASSO_BMDAPP },
      { id: "bmdapp-paloma", nome: "Paloma (app)", entrada: "applelog", tipo: "Conversão + estilo", tabela: "/luts-previa/bmd-paloma.bin", desc: "Suave e rosado, bom para moda e lifestyle. Prévia feita com o arquivo original do app.", onde: BMDAPP, passo: PASSO_BMDAPP },
      { id: "bmdapp-dusty", nome: "Dusty (app)", entrada: "applelog", tipo: "Conversão + estilo", tabela: "/luts-previa/bmd-dusty.bin", desc: "Cor empoeirada e terrosa, altas luzes contidas. Prévia feita com o arquivo original do app.", onde: BMDAPP, passo: PASSO_BMDAPP },
      { id: "bmdapp-rift", nome: "Rift (app)", entrada: "applelog", tipo: "Conversão + estilo", tabela: "/luts-previa/bmd-rift.bin", desc: "Frio e duro, de clipe e moda urbana. Prévia feita com o arquivo original do app.", onde: BMDAPP, passo: PASSO_BMDAPP },
      { id: "bmdapp-day-night", nome: "Day Night (app)", entrada: "applelog", tipo: "Conversão + estilo", tabela: "/luts-previa/bmd-day-night.bin", desc: "Noite americana: escurece e azula a cena gravada de dia. Prévia feita com o arquivo original do app.", onde: BMDAPP, passo: PASSO_BMDAPP },
      { id: "bmdapp-monochrome", nome: "Monochrome (app)", entrada: "applelog", tipo: "Conversão + estilo", tabela: "/luts-previa/bmd-monochrome.bin", desc: "Preto e branco com contraste de vídeo. Prévia feita com o arquivo original do app.", onde: BMDAPP, passo: PASSO_BMDAPP },
      { id: "bmd-applelog", nome: "Apple Log to Rec709 (iPhone)", entrada: "applelog", tipo: "Conversão", desc: "Para o que você grava em Apple Log, no app Câmera ou no Blackmagic Camera.", onde: BMDAPP, passo: "No app: Ajustes › LUTs › Seleção de LUT › Exportar LUT. O arquivo vai para o app Arquivos." },
    ],
  },
  {
    id: "kodak", nome: "Kodak (filme)", resumo: "Visual de película Kodak. A Kodak não publica LUTs; as grátis vêm do DaVinci Resolve e do Editor Hub (coleção Film-Luts, licença MIT). Use depois da conversão do seu log.",
    luts: [
      { id: "kodak-2383", nome: "Kodak 2383 (cópia de cinema)", entrada: "", look: "kodak-2383", tipo: "Filme", desc: "O visual de sala de cinema: contraste forte, sombras puxadas para o azul-esverdeado e pele quente.", onde: RESOLVE, passo: `${PASTA_RESOLVE} › Film Looks › Rec709 Kodak 2383 D65. Também no Editor Hub (Cinema print).` },
      { id: "kodak-portra160", nome: "Kodak Portra 160", entrada: "", look: "kodak-portra160", tipo: "Filme", desc: "A Portra mais limpa: pouco contraste, pele suave, cor contida.", onde: EDITORHUB, passo: "Seção Color negative › Kodak Portra 160." },
      { id: "kodak-portra", nome: "Kodak Portra 400", entrada: "", look: "kodak-portra", tipo: "Filme", desc: "Pele bonita e quente, contraste macio e verdes pastel. Clássico de retrato e moda.", onde: EDITORHUB, passo: "Seção Color negative › Kodak Portra 400 (há também a 400UC, mais saturada)." },
      { id: "kodak-portra800", nome: "Kodak Portra 800", entrada: "", look: "kodak-portra800", tipo: "Filme", desc: "Mais quente e com mais corpo; boa para fim de tarde e noite.", onde: EDITORHUB, passo: "Seção Color negative › Kodak Portra 800." },
      { id: "kodak-ektar", nome: "Kodak Ektar 100", entrada: "", look: "kodak-ektar", tipo: "Filme", desc: "Cor forte e limpa, vermelhos intensos. Bom para produto e paisagem.", onde: EDITORHUB, passo: "Seção Color negative › Kodak Ektar 100." },
      { id: "kodachrome", nome: "Kodachrome 64", entrada: "", look: "kodachrome", tipo: "Filme", desc: "O cromo clássico: vermelhos e azuis ricos, contraste de revista antiga.", onde: EDITORHUB, passo: "Seção Slide film › Kodachrome 64 (há 25 e 200)." },
      { id: "ektachrome", nome: "Ektachrome 100VS", entrada: "", look: "ektachrome", tipo: "Filme", desc: "Cromo vivo e um pouco frio, azuis fortes.", onde: EDITORHUB, passo: "Seção Slide film › Ektachrome 100VS." },
      { id: "cinestill", nome: "CineStill 800T", entrada: "", look: "cinestill", tipo: "Filme", desc: "Negativo de cinema de tungstênio: noite azulada com luzes quentes.", onde: EDITORHUB, passo: "Seção Community picks › CineStill 800T." },
      { id: "trix", nome: "Kodak Tri-X 400 (P&B)", entrada: "", look: "trix", tipo: "Filme", desc: "Preto e branco de reportagem: duro e granulado.", onde: EDITORHUB, passo: "Seção Black & white › Kodak Tri-X 400." },
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
      { id: "sony-signature", nome: "VENICE 2 · Signature LUT", entrada: "slog3", look: "sony-s709", tipo: "Conversão", desc: "O visual de fábrica da VENICE 2, parecido com o s709, um pouco mais denso.", onde: SONY, passo: "Na biblioteca, Signature LUT (VENICE 2)." },
      { id: "sony-709-800", nome: "S-Log3 → 709 (800%)", entrada: "slog3", look: "sony-709-800", tipo: "Conversão", desc: "Conversão clássica de TV: mais contraste e cor mais forte.", onde: SONY, passo: "Na biblioteca, baixe o pacote 709 (800%) das LUTs da BURANO." },
      { id: "sony-warm", nome: "BURANO Warm", entrada: "slog3", look: "sony-warm", tipo: "Conversão + estilo", desc: "Quente e dourado, de fim de tarde.", onde: SONY, passo: "Na biblioteca, pacote BURANO Warm." },
      { id: "sony-cool", nome: "BURANO Cool", entrada: "slog3", look: "sony-cool", tipo: "Conversão + estilo", desc: "Frio e limpo, de cidade e tecnologia.", onde: SONY, passo: "Na biblioteca, pacote BURANO Cool." },
      { id: "sony-vintage", nome: "BURANO Vintage", entrada: "slog3", look: "sony-vintage", tipo: "Conversão + estilo", desc: "Desbotado e amarelado, de memória.", onde: SONY, passo: "Na biblioteca, pacote BURANO Vintage." },
      { id: "sony-technicolor", nome: "Technicolor Look Collection", entrada: "slog3", look: "kodak-2383", tipo: "Conversão + estilo", desc: "Looks de cinema da Technicolor para S-Log3. A prévia usa uma cópia de cinema como aproximação.", onde: SONY, passo: "Na biblioteca, Technicolor Look Collection for VENICE." },
      { id: "sony-teal", nome: "BURANO Teal and Orange", entrada: "slog3", look: "sony-teal", tipo: "Conversão + estilo", desc: "Sombras azul-petróleo e pele laranja, o visual de cinema.", onde: SONY, passo: "Na biblioteca, pacote BURANO Teal and Orange." },
    ],
  },
  {
    id: "fujifilm", nome: "Fujifilm", resumo: "Para F-Log2 e F-Log (X-H2S, X-T5, X-S20, GFX). As simulações de filme da Fuji, que muita gente usa em vídeo.",
    luts: [
      { id: "fuji-709", nome: "F-Log2 → BT.709 (WDR)", entrada: "flog2", tipo: "Conversão", desc: "A conversão neutra da Fujifilm.", onde: FUJI, passo: "Baixe o .zip do seu modelo e use o arquivo F-Log2 to WDR (BT.709)." },
      { id: "fuji-eterna", nome: "F-Log2 → ETERNA", entrada: "flog2", look: "fuji-eterna", tipo: "Conversão + estilo", desc: "O filme de cinema da Fuji: pouco contraste, cor contida e sombras azuladas.", onde: FUJI, passo: "No .zip do seu modelo, o arquivo F-Log2 to ETERNA." },
      { id: "fuji-3513", nome: "Fujifilm 3513 (cópia de cinema)", entrada: "", look: "fuji-3513", tipo: "Filme", desc: "Cópia de cinema da Fuji: contraste firme e verdes frios.", onde: RESOLVE, passo: `${PASTA_RESOLVE} › Film Looks › Rec709 Fujifilm 3513DI D65. Também no Editor Hub (Cinema print).` },
      { id: "fuji-provia", nome: "Provia 100F", entrada: "", look: "fuji-provia", tipo: "Filme", desc: "A cor padrão da Fuji: viva e equilibrada.", onde: EDITORHUB, passo: "Seção Slide film › Fuji Provia 100F." },
      { id: "fuji-velvia", nome: "Velvia 50", entrada: "", look: "fuji-velvia", tipo: "Filme", desc: "Cor saturada e contraste alto, de paisagem.", onde: EDITORHUB, passo: "Seção Slide film › Fuji Velvia 50." },
      { id: "fuji-astia", nome: "Astia 100F", entrada: "", look: "fuji-astia", tipo: "Filme", desc: "Suave e fiel na pele, bom para retrato e moda.", onde: EDITORHUB, passo: "Seção Slide film › Fuji Astia 100F." },
      { id: "fuji-pro400h", nome: "Pro 400H", entrada: "", look: "fuji-pro400h", tipo: "Filme", desc: "Clara e pastel, verdes puxados para o menta. Querida em casamento e moda.", onde: EDITORHUB, passo: "Seção Color negative › Fuji Pro 400H." },
      { id: "fuji-superia", nome: "Superia 200", entrada: "", look: "fuji-superia", tipo: "Filme", desc: "Filme de dia a dia, levemente esverdeado.", onde: EDITORHUB, passo: "Seção Color negative › Fuji Superia 200 (há a 1600 para noite)." },
      { id: "fuji-chrome", nome: "Classic Chrome", entrada: "", look: "fuji-chrome", tipo: "Filme", desc: "Cor apagada e sombras duras, de revista de rua.", onde: EDITORHUB, passo: "Seção Camera looks › Classic Chrome. Para F-Log, a Fujifilm também tem no .zip de alguns modelos." },
      { id: "fuji-proneghi", nome: "Pro Neg Hi", entrada: "", look: "fuji-proneghi", tipo: "Filme", desc: "Retrato com mais contraste e pele natural.", onde: EDITORHUB, passo: "Seção Camera looks › Pro Neg Hi." },
      { id: "fuji-acros", nome: "Acros (P&B)", entrada: "", look: "fuji-acros", tipo: "Filme", desc: "Preto e branco fino da Fuji, com tons médios ricos.", onde: EDITORHUB, passo: "Seção Camera looks › Acros." },
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
    id: "criativas", nome: "Cinema grátis", resumo: "Pacotes abertos com uso comercial liberado (CC0, MIT, CC BY). Entram depois da conversão (sobre Rec.709).",
    luts: [
      { id: "eh-blockbuster", nome: "Blockbuster", entrada: "", look: "teal-laranja", tipo: "Estilo", desc: "Teal e laranja de filme de ação. Editor Hub Originals (CC0).", onde: EDITORHUB, passo: "EditorHub Originals › Blockbuster." },
      { id: "eh-deepteal", nome: "Deep Teal", entrada: "", look: "thriller", tipo: "Estilo", desc: "Tudo puxado para o ciano, sério e frio. Editor Hub Originals (CC0).", onde: EDITORHUB, passo: "EditorHub Originals › Deep Teal." },
      { id: "eh-golden", nome: "Golden Hour", entrada: "", look: "dourado", tipo: "Estilo", desc: "Fim de tarde dourado. Editor Hub Originals (CC0).", onde: EDITORHUB, passo: "EditorHub Originals › Golden Hour." },
      { id: "eh-matte", nome: "Matte Fade", entrada: "", look: "matte", tipo: "Estilo", desc: "Pretos lavados, ar de revista. Editor Hub Originals (CC0).", onde: EDITORHUB, passo: "EditorHub Originals › Matte Fade." },
      { id: "eh-forest", nome: "Moody Forest", entrada: "", look: "fuji-verde", tipo: "Estilo", desc: "Verdes fechados e clima. Editor Hub Originals (CC0).", onde: EDITORHUB, passo: "EditorHub Originals › Moody Forest." },
      { id: "eh-crisp", nome: "Crisp Clean", entrada: "", look: "comercial", tipo: "Estilo", desc: "Limpo e vivo, de comercial. Editor Hub Originals (CC0).", onde: EDITORHUB, passo: "EditorHub Originals › Crisp Clean." },
      { id: "eh-nightdrive", nome: "Night Drive", entrada: "", look: "noite-azul", tipo: "Estilo", desc: "Noite azul de cidade. Editor Hub, Movie looks (CC0).", onde: EDITORHUB, passo: "Movie looks › Night Drive." },
      { id: "eh-pastelhotel", nome: "Pastel Hotel", entrada: "", look: "pastel", tipo: "Estilo", desc: "Rosa e pastel, de filme de Wes Anderson. Editor Hub, Movie looks (CC0).", onde: EDITORHUB, passo: "Movie looks › Pastel Hotel." },
      { id: "eh-bleach", nome: "Bleach Bypass", entrada: "", look: "bleach", tipo: "Estilo", desc: "Pouca cor e muito contraste. Editor Hub, Movie looks (CC0).", onde: EDITORHUB, passo: "Movie looks › Bleach Bypass." },
      { id: "eh-peaky", nome: "Peaky Blinders", entrada: "", look: "peaky", tipo: "Estilo", desc: "Dessaturado, duro e um pouco quente. Editor Hub, Community picks (CC0).", onde: EDITORHUB, passo: "Community picks › Peaky Blinders." },
      { id: "eh-bluepink", nome: "Blue & Pink", entrada: "", look: "blue-pink", tipo: "Estilo", desc: "Sombras azuis e luzes rosadas. Editor Hub, Community picks (CC0).", onde: EDITORHUB, passo: "Community picks › Blue & Pink." },
      { id: "open-teal", nome: "OpenLUTs · Teal & Orange", entrada: "", look: "teal-laranja", tipo: "Estilo", desc: "Domínio público (CC0). O pacote também tem S-Log3 para Rec.709.", onde: { label: "OpenLUTs no GitHub", url: "https://github.com/darkyboys/openluts" }, passo: "Code › Download ZIP." },
      { id: "daedal-clean", nome: "Daedal · Clean Commercial", entrada: "", look: "comercial", tipo: "Estilo", desc: "8 estilos limpos de comercial. Domínio público (CC0).", onde: { label: "Daedal · Clean Commercial", url: "https://daedal.art/resources/clean-commercial-pack/" }, passo: "Botão de download da página." },
      { id: "slay-film", nome: "slay · Film", entrada: "", look: "kodak-quente", tipo: "Estilo", desc: "5 estilos (Amber, Fade, Neon, Film, Portrait). Livre com crédito a \"slay\" (CC BY 4.0).", onde: { label: "slay LUTs no GitHub", url: "https://github.com/slaycamera/luts" }, passo: "Code › Download ZIP." },
    ],
  },
  {
    id: "vincit", nome: "VINCIT (autorais)", resumo: "LUTs nossas, feitas pelo HUB. Estas você baixa aqui mesmo (.cube) e o plugin do Premiere instala sozinho. Use depois da conversão do log (Lumetri › Criativo › Look).",
    luts: ([
      ["vlog-cinema", "Vlog Cinema", "O estilo do Vinícius: pele quente, verdes frios e contraste de cinema."],
      ["isys-creme", "ISYS Creme", "Para a ISYS: creme suave, vinho e vermelho mais ricos, sem pesar."],
      ["natal", "Natal", "Vermelho vivo, brilho dourado e sombras fundas. Campanha de Natal."],
      ["comercial", "Comercial limpo", "Contraste leve e cor viva sem estourar a pele. Produto e e-commerce."],
      ["teal-laranja", "Teal & laranja", "Sombras azul-petróleo e pele laranja."],
      ["kodak-quente", "Filme quente", "Negativo quente: verdes amarelados, pretos macios."],
      ["fuji-verde", "Filme verde", "Verdes puxados para o ciano, cor contida."],
      ["dourado", "Hora dourada", "Altas luzes douradas e pele quente."],
      ["pastel", "Pastel de moda", "Clara, pouco contraste e cor suave. Lookbook."],
      ["matte", "Matte desbotado", "Pretos levantados e cor baixa."],
      ["vintage-70", "Vintage anos 70", "Sépia leve, sombras esverdeadas."],
      ["bleach", "Bleach bypass", "Pouca cor e muito contraste. Esporte e treino."],
      ["thriller", "Thriller frio", "Ciano, cor baixa e contraste alto."],
      ["noite-azul", "Noite azul", "Escura e azulada."],
      ["noir", "Noir P&B", "Preto e branco duro."],
      ["pb-suave", "P&B suave", "Preto e branco de baixo contraste."],
    ] as const).map(([look, nome, desc]) => ({ id: `vincit-${look}`, nome, entrada: "", look, tipo: "Autoral" as const, desc, autoral: true, onde: { label: "o HUB (.cube)", url: `/api/luts/${look}.cube` }, passo: "Arquivo nosso: pode usar e repassar. No Premiere, Lumetri › Criativo › Look." })),
  },
];

export const TODAS: (Lut & { marca: string })[] = MARCAS.flatMap((m) => m.luts.map((l) => ({ ...l, marca: m.nome })));
export const lutPorId = (id?: string) => TODAS.find((l) => l.id === id);

/** perfis de log que dá para escolher no Editor (para converter o vídeo) */
export const LOGS: [string, string][] = [
  ["bmdfilm5", "Blackmagic Film Gen 5"], ["applelog", "Apple Log (iPhone)"], ["slog3", "Sony S-Log3"], ["clog3", "Canon Log 3"],
  ["vlog", "Panasonic V-Log"], ["flog2", "Fujifilm F-Log2"], ["flog", "Fujifilm F-Log"], ["nlog", "Nikon N-Log"], ["dlog", "DJI D-Log"],
];
