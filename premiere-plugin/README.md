# Plugin VINCIT HUB para o Premiere Pro (UXP)

Painel que liga o Premiere ao HUB e ao Claude:

1. Lê a sequência ativa (clipes e transcrição do Premiere) e grava em `av_edit_sessions`.
2. O Claude lê pelo conector (`listar_edicoes_premiere`) e devolve o plano com `enviar_plano_edicao`.
3. O painel aplica o plano: marcadores, legendas/títulos via MOGRT do kit, zoom por keyframe, B-roll que já está no projeto. Cortes entram como marcadores.

Requer Premiere Pro 25.6 ou mais novo (UXP estável). A API usada está em `@adobe/premierepro` 27.

## Instalar

- Usuário final: baixar `/downloads/vincit-hub-premiere.ccx` no HUB e dar dois cliques (Creative Cloud instala).
- Desenvolvimento: UXP Developer Tool › Add Plugin › escolher `manifest.json` desta pasta › Load.

## Gerar o .ccx

```
cd premiere-plugin && zip -r ../public/downloads/vincit-hub-premiere.ccx manifest.json index.html style.css hub.js premiere.js main.js
```
