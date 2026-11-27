# Plugin VINCIT HUB para o Premiere Pro (UXP)

Painel que liga o Premiere ao HUB e ao Claude:

1. Lê a sequência ativa (clipes e transcrição do Premiere) e grava em `av_edit_sessions`.
2. O Claude lê pelo conector (`listar_edicoes_premiere`) e devolve o plano com `enviar_plano_edicao`.
3. O painel aplica o plano: marcadores, legendas/títulos via MOGRT do kit, zoom por keyframe, B-roll que já está no projeto. Cortes entram como marcadores.
4. Cortar pausas (0.4): acha as pausas pela transcrição do Premiere (pausa mínima e folga ajustáveis; o padrão vem de `regras.silencio_ms` do kit), mostra a lista para desmarcar e monta uma sequência nova "· sem pausas" com os pedaços em V1/A1. A original não muda. O botão "Revisar e cortar de verdade" faz o mesmo com os cortes do plano. Não há limite em dB: o UXP não lê o volume do áudio.
5. Segunda saída do Editor do HUB: o botão "Enviar para o Premiere" grava a edição montada no HUB (cortes, legendas, letterings, motion, câmera com tipo do movimento e imagens) já como `plano_pronto`, no tempo do arquivo original. O painel pega e aplica igual.

Requer Premiere Pro 25.6 ou mais novo (UXP estável). A API usada está em `@adobe/premierepro` 27.

## Instalar

- Usuário final: baixar `/downloads/vincit-hub-premiere.ccx` no HUB e dar dois cliques (Creative Cloud instala).
- Desenvolvimento: UXP Developer Tool › Add Plugin › escolher `manifest.json` desta pasta › Load.

## Gerar o .ccx

```
cd premiere-plugin && zip -r ../public/downloads/vincit-hub-premiere.ccx manifest.json index.html style.css logo.png hub.js cortes.js premiere.js main.js
```
