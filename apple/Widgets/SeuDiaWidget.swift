import WidgetKit
import SwiftUI

/// "Seu dia": pequeno (Hoje), médio, grande e tela bloqueada (retângulo e linha do relógio).
struct SeuDiaWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "SeuDia", provider: Provedor()) { e in
            SeuDiaView(e: e)
        }
        .configurationDisplayName("Seu dia")
        .description("Tarefas de hoje, atrasadas e o próximo compromisso.")
        .supportedFamilies(familias)
        .contentMarginsDisabled()
    }

    private var familias: [WidgetFamily] {
        #if os(iOS)
        return [.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline]
        #else
        return [.systemSmall, .systemMedium, .systemLarge]
        #endif
    }
}

struct SeuDiaView: View {
    @Environment(\.widgetFamily) var familia
    var e: Entrada

    var body: some View {
        Group {
            if !e.conectado {
                SemConexao().padding(16)
            } else if let r = e.resumo {
                switch familia {
                case .systemSmall: HojePequeno(r: r)
                case .systemMedium: SeuDiaMedio(r: r, agora: e.date)
                case .systemLarge: SeuDiaGrande(r: r, agora: e.date)
                #if os(iOS)
                case .accessoryRectangular: BloqueioRetangulo(r: r, agora: e.date)
                case .accessoryInline: BloqueioLinha(r: r, agora: e.date)
                #endif
                default: HojePequeno(r: r)
                }
            } else {
                SemConexao().padding(16)
            }
        }
        .modifier(Fundo(familia: familia))
    }
}

/// fundo escuro só nos widgets grandes; na tela bloqueada o sistema cuida do vidro
struct Fundo: ViewModifier {
    var familia: WidgetFamily
    func body(content: Content) -> some View {
        switch familia {
        case .systemSmall, .systemMedium, .systemLarge, .systemExtraLarge:
            content.fundoHub()
        default:
            content.containerBackground(for: .widget) { Color.clear }
        }
    }
}

struct HojePequeno: View {
    var r: Resumo
    var body: some View {
        let cor = Tema.mint(r)
        VStack(alignment: .leading, spacing: 0) {
            Kicker(texto: "Hoje", cor: cor)
            Spacer(minLength: 6)
            Text("\(r.hoje.abertas)")
                .font(Tema.titulo(46))
                .foregroundStyle(Tema.paper)
            Text(r.hoje.abertas == 0 ? "tudo em dia" : r.hoje.abertas == 1 ? "tarefa para hoje" : "tarefas para hoje")
                .font(.system(size: 13))
                .foregroundStyle(Tema.paper)
            Spacer(minLength: 6)
            VStack(alignment: .leading, spacing: 2) {
                if r.hoje.atrasadas > 0 {
                    Text("● \(r.hoje.atrasadas) atrasada\(r.hoje.atrasadas == 1 ? "" : "s")").foregroundStyle(Tema.red)
                }
                if r.hoje.publicar > 0 {
                    Text("● \(r.hoje.publicar) post\(r.hoje.publicar == 1 ? "" : "s") hoje").foregroundStyle(cor)
                }
                if r.hoje.atrasadas == 0 && r.hoje.publicar == 0 {
                    Text("● \(r.hoje.concluidas) feita\(r.hoje.concluidas == 1 ? "" : "s") hoje").foregroundStyle(cor)
                }
            }
            .font(.system(size: 12, weight: .semibold))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(16)
        .widgetURL(Atalho.seuDia)
    }
}

struct SeuDiaMedio: View {
    var r: Resumo
    var agora: Date
    var body: some View {
        let cor = Tema.mint(r)
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Kicker(texto: "Seu dia · \(r.diaCurto)", cor: cor)
                Spacer()
                if r.hoje.atrasadas > 0 { Selo(texto: "\(r.hoje.atrasadas) atrasada\(r.hoje.atrasadas == 1 ? "" : "s")", cor: Tema.red) }
            }
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 7) {
                    if r.tarefas.isEmpty {
                        Text("Nada pendente hoje.").font(.system(size: 13)).foregroundStyle(Tema.fog)
                    }
                    ForEach(r.tarefas.prefix(r.proximo == nil ? 4 : 3)) { t in LinhaTarefa(t: t) }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                if let p = r.proximo {
                    CaixaProximo(p: p, cor: cor, agora: agora, compacta: true)
                        .frame(width: 118)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .widgetURL(Atalho.seuDia)
    }
}

struct SeuDiaGrande: View {
    var r: Resumo
    var agora: Date
    var body: some View {
        let cor = Tema.mint(r)
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Kicker(texto: "Seu dia", cor: cor)
                    Text(r.saudacao).font(Tema.titulo(20)).foregroundStyle(Tema.paper).lineLimit(1)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 0) {
                    Text("\(r.hoje.abertas)").font(Tema.titulo(32)).foregroundStyle(Tema.paper)
                    Text("para hoje").font(.system(size: 11)).foregroundStyle(Tema.fog)
                }
            }
            VStack(alignment: .leading, spacing: 8) {
                if r.tarefas.isEmpty {
                    Text("Nada pendente. Bom trabalho!").font(.system(size: 13)).foregroundStyle(Tema.fog)
                }
                ForEach(r.tarefas.prefix(5)) { t in LinhaTarefa(t: t) }
            }
            if r.proximo != nil || r.hoje.publicar > 0 {
                HStack {
                    if let p = r.proximo { CaixaProximo(p: p, cor: cor, agora: agora) }
                    if r.hoje.publicar > 0 { Selo(texto: "\(r.hoje.publicar) post\(r.hoje.publicar == 1 ? "" : "s") hoje", cor: cor) }
                }
            }
            Spacer(minLength: 0)
            VStack(spacing: 6) {
                HStack {
                    Text("Semana · \(r.semana.feitasPrevistas) de \(r.semana.previstas)").foregroundStyle(Tema.fog)
                    Spacer()
                    Text(r.semana.pct.map { "\($0)%" } ?? "–").bold().foregroundStyle(Tema.paper)
                }
                .font(.system(size: 12))
                GeometryReader { g in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color(hex: "#26262a"))
                        Capsule().fill(cor).frame(width: g.size.width * CGFloat(r.semana.pct ?? 0) / 100)
                    }
                }
                .frame(height: 6)
            }
            HStack(spacing: 8) {
                Link(destination: Atalho.nova) {
                    Text("＋ Nova tarefa").frame(maxWidth: .infinity, minHeight: 30)
                        .background(Tema.panel2, in: RoundedRectangle(cornerRadius: 10))
                        .foregroundStyle(Tema.paper)
                }
                Link(destination: Atalho.seuDia) {
                    Text("Abrir Seu dia").frame(maxWidth: .infinity, minHeight: 30)
                        .background(cor, in: RoundedRectangle(cornerRadius: 10))
                        .foregroundStyle(Tema.ink)
                }
            }
            .font(.system(size: 12, weight: .semibold))
        }
        .padding(16)
        .widgetURL(Atalho.seuDia)
    }
}

#if os(iOS)
struct BloqueioRetangulo: View {
    var r: Resumo
    var agora: Date
    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            if let p = r.proximo {
                Text("◆ \(p.hora)\(Resumo.falta(ate: p.inicioDate, de: agora).map { " · \($0)" } ?? "")")
                    .font(.system(size: 12, weight: .bold)).opacity(0.75)
                Text(p.titulo).font(.system(size: 15, weight: .bold)).lineLimit(1)
            } else {
                Text("◆ HOJE").font(.system(size: 12, weight: .bold)).opacity(0.75)
                Text("\(r.hoje.abertas) tarefa\(r.hoje.abertas == 1 ? "" : "s")").font(.system(size: 15, weight: .bold))
            }
            Text(resumoCurto).font(.system(size: 12)).opacity(0.75).lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetURL(Atalho.seuDia)
    }
    var resumoCurto: String {
        var p: [String] = []
        if r.hoje.atrasadas > 0 { p.append("\(r.hoje.atrasadas) atrasada\(r.hoje.atrasadas == 1 ? "" : "s")") }
        if r.hoje.publicar > 0 { p.append("\(r.hoje.publicar) post\(r.hoje.publicar == 1 ? "" : "s")") }
        if p.isEmpty { p.append("\(r.hoje.concluidas) feita\(r.hoje.concluidas == 1 ? "" : "s") hoje") }
        return p.joined(separator: " · ")
    }
}

/// linha acima do relógio: vira o compromisso quando falta menos de 1 hora
struct BloqueioLinha: View {
    var r: Resumo
    var agora: Date
    var body: some View {
        if let p = r.proximo, let d = p.inicioDate, d.timeIntervalSince(agora) < 3600, d > agora {
            Text("◆ \(p.titulo) \(p.hora)")
        } else {
            Text("◆ \(r.hoje.abertas) tarefa\(r.hoje.abertas == 1 ? "" : "s") hoje")
        }
    }
}
#endif
