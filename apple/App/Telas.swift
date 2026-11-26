import SwiftUI

struct Inicio: View {
    @EnvironmentObject var m: Modelo
    var body: some View {
        ZStack {
            Tema.ink.ignoresSafeArea()
            if m.conectado { SeuDiaTela() } else { Conectar() }
        }
    }
}

// MARK: - conectar

struct Conectar: View {
    @EnvironmentObject var m: Modelo
    @Environment(\.openURL) var openURL
    @State private var colado = ""
    @State private var ocupado = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Logo(tamanho: 64)
                Text("VINCIT HUB").font(Tema.kicker(13)).tracking(2).foregroundStyle(Tema.mint(nil))
                Text("Conecte sua conta").font(Tema.titulo(32)).foregroundStyle(Tema.paper)
                Text("Seu dia, tarefas e compromissos nos widgets do iPhone e do Mac.")
                    .font(.system(size: 16)).foregroundStyle(Tema.fog)

                VStack(alignment: .leading, spacing: 10) {
                    Passo(n: 1, texto: "Abra Minha conta no HUB, no cartão Widget no celular e no Mac.")
                    Passo(n: 2, texto: "Toque em Criar meu widget e depois em Conectar o app VINCIT HUB.")
                    Passo(n: 3, texto: "Pronto. Se o botão não abrir o app, copie o link de conexão e cole aqui.")
                }
                .padding(16)
                .background(Tema.panel, in: RoundedRectangle(cornerRadius: 16))

                Button {
                    openURL(Conta.web("/conta#widget"))
                } label: {
                    Text("Abrir Minha conta no HUB").frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.borderedProminent)
                .foregroundStyle(Tema.ink)

                HStack {
                    TextField("Colar link de conexão", text: $colado)
                        .textFieldStyle(.plain)
                        #if os(iOS)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                        #endif
                        .autocorrectionDisabled()
                        .padding(12)
                        .background(Tema.panel2, in: RoundedRectangle(cornerRadius: 10))
                    Button(ocupado ? "…" : "Conectar") {
                        Task {
                            ocupado = true
                            if colado.isEmpty { colado = Area.ler() ?? "" }
                            _ = await m.conectar(colado)
                            ocupado = false
                        }
                    }
                    .buttonStyle(.bordered)
                    .disabled(ocupado)
                }
                if let e = m.erro { Text(e).font(.system(size: 14)).foregroundStyle(Tema.red) }
            }
            .padding(24)
            .frame(maxWidth: 520, alignment: .leading)
        }
    }
}

struct Passo: View {
    var n: Int
    var texto: String
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Text("\(n)").font(Tema.kicker(12)).foregroundStyle(Tema.ink)
                .frame(width: 22, height: 22).background(Tema.mint(nil), in: Circle())
            Text(texto).font(.system(size: 15)).foregroundStyle(Tema.paper)
        }
    }
}

struct Logo: View {
    var tamanho: CGFloat
    var body: some View {
        Text("V")
            .font(.system(size: tamanho * 0.55, weight: .heavy))
            .foregroundStyle(Tema.mint(nil))
            .frame(width: tamanho, height: tamanho)
            .background(Tema.ink, in: RoundedRectangle(cornerRadius: tamanho * 0.24))
            .overlay(RoundedRectangle(cornerRadius: tamanho * 0.24).stroke(Tema.line))
    }
}

/// área de transferência do iPhone ou do Mac
enum Area {
    static func ler() -> String? {
        #if os(iOS)
        return UIPasteboard.general.string
        #else
        return NSPasteboard.general.string(forType: .string)
        #endif
    }
}

// MARK: - Seu dia

struct SeuDiaTela: View {
    @EnvironmentObject var m: Modelo
    @State private var nova = ""
    @FocusState private var focoNova: Bool

    var body: some View {
        let r = m.resumo
        let cor = Tema.mint(r)
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Kicker(texto: "Seu dia\(r.map { " · \($0.diaCurto)" } ?? "")", cor: cor)
                        Text(r?.saudacao ?? "Seu dia").font(Tema.titulo(28)).foregroundStyle(Tema.paper)
                    }
                    Spacer()
                    if m.carregando { ProgressView().controlSize(.small) }
                }

                if let r {
                    HStack(spacing: 10) {
                        Numero(valor: "\(r.hoje.abertas)", rotulo: "para hoje", cor: Tema.paper)
                        Numero(valor: "\(r.hoje.atrasadas)", rotulo: "atrasadas", cor: r.hoje.atrasadas > 0 ? Tema.red : Tema.paper)
                        Numero(valor: r.semana.pct.map { "\($0)%" } ?? "–", rotulo: "da semana", cor: cor)
                    }
                }

                HStack {
                    TextField("Nova tarefa para hoje", text: $nova)
                        .textFieldStyle(.plain)
                        .focused($focoNova)
                        .onSubmit(criar)
                        .padding(12)
                        .background(Tema.panel2, in: RoundedRectangle(cornerRadius: 10))
                    Button("Criar", action: criar).buttonStyle(.bordered).disabled(nova.trimmingCharacters(in: .whitespaces).isEmpty)
                }

                if let r {
                    Cartao {
                        if r.tarefas.isEmpty {
                            Text("Nada pendente. Bom trabalho!").foregroundStyle(Tema.fog)
                        }
                        ForEach(r.tarefas) { t in
                            LinhaApp(t: t)
                            if t.id != r.tarefas.last?.id { Divider().overlay(Tema.line) }
                        }
                    }

                    if let p = r.proximo {
                        Cartao {
                            Text("PRÓXIMO · \(p.hora)\(p.dia != r.data ? " · \(p.dia.split(separator: "-").reversed().prefix(2).joined(separator: "/"))" : "")")
                                .font(Tema.kicker()).foregroundStyle(cor)
                            Text(p.titulo).font(Tema.titulo(18)).foregroundStyle(Tema.paper)
                            Text([p.tipo, p.local, Resumo.falta(ate: p.inicioDate)].compactMap { $0 }.joined(separator: " · "))
                                .font(.system(size: 13)).foregroundStyle(Tema.fog)
                        }
                    }

                    if !r.publicar.isEmpty {
                        Cartao {
                            Text("PUBLICAR HOJE").font(Tema.kicker()).foregroundStyle(Tema.amber)
                            ForEach(r.publicar, id: \.self) { Text($0).foregroundStyle(Tema.paper) }
                        }
                    }

                    Cartao {
                        HStack {
                            Text("SEMANA").font(Tema.kicker()).foregroundStyle(cor)
                            Spacer()
                            Text("\(r.semana.concluidas) feitas · \(r.semana.publicados) publicados").font(.system(size: 12)).foregroundStyle(Tema.fog)
                        }
                        BarrasSemana(semana: r.semana, hoje: r.data, cor: cor).frame(height: 80)
                    }
                }

                if let e = m.erro { Text(e).font(.system(size: 14)).foregroundStyle(Tema.red) }

                Button { m.abrirNoNavegador("/") } label: {
                    Text("Abrir o HUB completo").frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.borderedProminent)
                .foregroundStyle(Tema.ink)

                Ajustes()
            }
            .padding(20)
            .frame(maxWidth: 560, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .refreshable { await m.atualizar() }
        .onChange(of: m.pedirNovaTarefa) { _, pedir in
            if pedir { focoNova = true; m.pedirNovaTarefa = false }
        }
    }

    private func criar() {
        let t = nova
        nova = ""
        Task { await m.criar(t, hoje: true) }
    }
}

struct Numero: View {
    var valor: String
    var rotulo: String
    var cor: Color
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(valor).font(Tema.titulo(26)).foregroundStyle(cor)
            Text(rotulo).font(.system(size: 12)).foregroundStyle(Tema.fog)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Tema.panel, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Tema.line))
    }
}

struct Cartao<C: View>: View {
    @ViewBuilder var conteudo: C
    var body: some View {
        VStack(alignment: .leading, spacing: 8) { conteudo }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Tema.panel, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Tema.line))
    }
}

struct LinhaApp: View {
    @EnvironmentObject var m: Modelo
    var t: Resumo.Tarefa
    var body: some View {
        HStack(spacing: 10) {
            Button { Task { await m.concluir(t) } } label: {
                Circle().strokeBorder(t.atrasada ? Tema.red : Color(hex: "#4a4f55"), lineWidth: 1.5).frame(width: 20, height: 20)
            }
            .buttonStyle(.plain)
            Button { m.abrirNoNavegador("/tarefas?t=\(t.id)") } label: {
                HStack {
                    Text(t.titulo).foregroundStyle(Tema.paper).lineLimit(2).multilineTextAlignment(.leading)
                    Spacer()
                    Text(t.quando).font(.system(size: 12, design: .monospaced)).foregroundStyle(t.atrasada ? Tema.red : Tema.fog)
                }
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 4)
    }
}

struct Ajustes: View {
    @EnvironmentObject var m: Modelo
    @State private var avisos = Conta.avisos
    @State private var confirmar = false
    var body: some View {
        Cartao {
            Toggle(isOn: $avisos) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Avisos").foregroundStyle(Tema.paper)
                    Text("Resumo às 8:00 e 15 min antes de cada compromisso.").font(.system(size: 12)).foregroundStyle(Tema.fog)
                }
            }
            .onChange(of: avisos) { _, v in
                Conta.avisos = v
                Task {
                    if v { await Avisos.pedirPermissao() }
                    if let r = m.resumo { await Avisos.agendar(r) }
                }
            }
            Divider().overlay(Tema.line)
            Button(confirmar ? "Toque de novo para desconectar" : "Desconectar esta conta") {
                if confirmar { m.desconectar() } else { confirmar = true }
            }
            .foregroundStyle(confirmar ? Tema.red : Tema.fog)
            .buttonStyle(.plain)
            .font(.system(size: 14))
        }
    }
}

// MARK: - Mac: painel da barra de menus

#if os(macOS)
struct PainelRapido: View {
    @EnvironmentObject var m: Modelo
    @State private var nova = ""
    var body: some View {
        let r = m.resumo
        let cor = Tema.mint(r)
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Kicker(texto: "VINCIT HUB", cor: cor)
                Spacer()
                if m.carregando { ProgressView().controlSize(.mini) }
                else { Button { Task { await m.atualizar() } } label: { Image(systemName: "arrow.clockwise") }.buttonStyle(.plain).foregroundStyle(Tema.fog) }
            }
            if !m.conectado {
                Text("Abra o app VINCIT HUB e conecte sua conta.").foregroundStyle(Tema.fog)
            } else {
                TextField("＋ Nova tarefa…", text: $nova)
                    .textFieldStyle(.plain)
                    .padding(10)
                    .background(Tema.panel2, in: RoundedRectangle(cornerRadius: 10))
                    .onSubmit {
                        let t = nova; nova = ""
                        Task { await m.criar(t, hoje: true) }
                    }
                if let r {
                    ForEach(r.tarefas.prefix(6)) { t in LinhaApp(t: t) }
                    if r.tarefas.isEmpty { Text("Nada pendente hoje.").foregroundStyle(Tema.fog) }
                    if let p = r.proximo {
                        HStack(spacing: 0) {
                            Rectangle().fill(cor).frame(width: 3)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("PRÓXIMO · \(p.hora)").font(Tema.kicker()).foregroundStyle(cor)
                                Text("\(p.titulo)\(p.local.map { " · \($0)" } ?? "")").font(.system(size: 13, weight: .semibold)).foregroundStyle(Tema.paper)
                            }
                            .padding(8)
                            Spacer()
                        }
                        .background(Tema.panel2, in: RoundedRectangle(cornerRadius: 10))
                    }
                }
                if let e = m.erro { Text(e).font(.system(size: 12)).foregroundStyle(Tema.red) }
                HStack {
                    Button("Agenda") { m.abrirNoNavegador("/agenda") }.frame(maxWidth: .infinity)
                    Button("Abrir HUB") { m.abrirNoNavegador("/") }.buttonStyle(.borderedProminent).frame(maxWidth: .infinity)
                }
            }
            Divider()
            Button("Sair do VINCIT HUB") { NSApplication.shared.terminate(nil) }
                .buttonStyle(.plain).font(.system(size: 12)).foregroundStyle(Tema.fog)
        }
        .padding(14)
        .frame(width: 340)
        .background(Tema.ink)
        .task { await m.atualizar() }
    }
}
#endif
