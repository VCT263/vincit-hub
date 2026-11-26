# App VINCIT HUB (iPhone e Mac)

App nativo com os widgets do HUB: tela inicial (pequeno, médio, grande), tela bloqueada (linha do relógio, retângulo, círculos da semana e de atrasadas), mesa do Mac e contador na barra de menus do Mac com painel rápido. Avisos locais: resumo às 8:00 e 15 minutos antes de cada compromisso.

O app não guarda senha: ele usa a chave pessoal do widget, criada em **Minha conta → Widget no celular e no Mac → Conectar o app VINCIT HUB**. Trocar a chave lá desconecta o app.

## O que o app usa do HUB
- `GET /api/resumo?k=…` resumo do Seu dia (o mesmo do widget Scriptable).
- `POST /api/resumo/acao` com `Authorization: Bearer <chave>`: `{acao:"concluir", id}`, `{acao:"reabrir", id}`, `{acao:"criar", titulo, data?}`.

## Compilar e instalar (no Mac)
1. Conta Apple Developer ativa (US$ 99/ano) e Xcode 16 ou mais novo.
2. `brew install xcodegen`, depois, nesta pasta: `xcodegen generate` e abra `VincitHub.xcodeproj`.
3. Em `Config.xcconfig`, preencha `DEVELOPMENT_TEAM` com o seu Team ID (developer.apple.com → Membership). Se o identificador `com.vincit.hub` não estiver livre, troque `VINCIT_BUNDLE`.
4. Para cada um dos 4 alvos, em **Signing & Capabilities**, confira o time e o App Group (`group.com.vincit.hub` no iPhone; no Mac o Xcode põe o Team ID na frente).
5. **iPhone:** conecte o iPhone, escolha o esquema `VincitHub-iOS` e rode (▶). Para distribuir: Product → Archive → Distribute → TestFlight.
6. **Mac:** esquema `VincitHub-macOS` → rode, ou Product → Archive → Distribute → Copy App e arraste para Aplicativos.
7. Abra o app, conecte pela página Minha conta e adicione os widgets (segure a tela inicial → Editar → Adicionar widget → VINCIT HUB; no Mac, botão direito na mesa → Editar Widgets).

A compilação é conferida automaticamente no GitHub (`.github/workflows/apple.yml`) a cada mudança nesta pasta, sem assinatura.
