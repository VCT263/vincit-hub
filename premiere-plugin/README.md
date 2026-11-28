# Plugin VINCIT HUB para o Premiere Pro (UXP)

Painel que liga o Premiere ao HUB e ao Claude:

1. Lê a sequência ativa (clipes e transcrição do Premiere) e grava em `av_edit_sessions`.
2. O Claude lê pelo conector (`listar_edicoes_premiere`) e devolve o plano com `enviar_plano_edicao`.
3. O painel aplica o plano: marcadores, legendas/títulos via MOGRT do kit, zoom por keyframe, B-roll que já está no projeto. Cortes entram como marcadores.
4. Cortar pausas (0.4): acha as pausas pela transcrição do Premiere (pausa mínima e folga ajustáveis; o padrão vem de `regras.silencio_ms` do kit), mostra a lista para desmarcar e monta uma sequência nova "· sem pausas" com os pedaços em V1/A1. A original não muda. O botão "Revisar e cortar de verdade" faz o mesmo com os cortes do plano. Não há limite em dB: o UXP não lê o volume do áudio.
5. Painel 0.5 com a base do IPM Studio (identidade v4 do painel de edição do IPM, com a luz menta do HUB): abas Editar / Revisar / Histórico, claquete da sequência aberta, listas como linhas de trilha, luzes de estado redondas, um "?" por cartão, Detalhes recolhidos com contador e a ação principal fixa no rodapé (muda com a aba). Novidades: ritmo do vídeo (Livre, Calmo, No ritmo, Energético) vai no pedido ao Claude; Conferir um a um (cada item do plano com o tempo; clicar leva a agulha do Premiere até o ponto e marca como visto); Histórico das edições enviadas; cronômetro de quanto o Claude está levando e de quanto durou aplicar e cortar.
6. Painel 0.6: em Revisar, "Achar pausas e tropeços" junta às pausas o gaguejo (palavra repetida colada), o vício com silêncio dos dois lados (lista em `regras.vicios` do kit), o falso começo e a tomada repetida (frase dita de novo logo depois; fica a última). Tudo entra na mesma lista para desmarcar antes de cortar. A folga padrão vem de `regras.folga_ms` do kit. Base: cut-mistakes do herk-edit-kit (MIT).
6. Segunda saída do Editor do HUB: o botão "Enviar para o Premiere" grava a edição montada no HUB (cortes, legendas, letterings, motion, câmera com tipo do movimento e imagens) já como `plano_pronto`, no tempo do arquivo original. O painel pega e aplica igual.

7. Painel 0.7: cartão "Cor (LUT)" em Editar, com a Biblioteca de LUTs do HUB (`/api/luts/catalogo`, público). As autorais VINCIT vêm de `/api/luts/<look>.cube`: o painel salva na pasta escolhida (lembrada por token), põe o Lumetri nos clipes de V1 (`AE.ADBE Lumetri`) e tenta pôr o arquivo no Look. A API não documenta o campo de arquivo do Lumetri; se o Premiere recusar, fica um marcador no início com o caminho. As de marca abrem o site oficial e deixam o passo num marcador.

Requer Premiere Pro 25.6 ou mais novo (UXP estável). A API usada está em `@adobe/premierepro` 27.

## Instalar

- Usuário final: baixar `/downloads/vincit-hub-premiere.ccx` no HUB e dar dois cliques (Creative Cloud instala).
- Desenvolvimento: UXP Developer Tool › Add Plugin › escolher `manifest.json` desta pasta › Load.

## Gerar o .ccx

```
cd premiere-plugin && zip -r ../public/downloads/vincit-hub-premiere.ccx manifest.json index.html style.css logo.png hub.js cortes.js premiere.js main.js
```
