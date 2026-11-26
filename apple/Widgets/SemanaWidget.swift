import WidgetKit
import SwiftUI

/// "Semana": anel de progresso (pequeno e círculo da tela bloqueada) e barras por dia (médio).
struct SemanaWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "Semana", provider: Provedor()) { e in
            SemanaView(e: e)
        }
        .configurationDisplayName("Semana")
        .description("Quanto da semana já foi feito.")
        .supportedFamilies(familias)
        .contentMarginsDisabled()
    }

    private var familias: [WidgetFamily] {
        #if os(iOS)
        return [.systemSmall, .systemMedium, .accessoryCircular]
        #else
        return [.systemSmall, .systemMedium]
        #endif
    }
}

struct SemanaView: View {
    @Environment(\.widgetFamily) var familia
    var e: Entrada
    var body: some View {
        Group {
            if let r = e.resumo, e.conectado {
                switch familia {
                case .systemMedium: SemanaMedio(r: r)
                #if os(iOS)
                case .accessoryCircular:
                    Gauge(value: Double(r.semana.pct ?? 0), in: 0...100) {
                        Text("SEMANA")
                    } currentValueLabel: {
                        Text("\(r.semana.pct ?? 0)")
                    }
                    .gaugeStyle(.accessoryCircularCapacity)
                    .widgetURL(Atalho.seuDia)
                #endif
                default: SemanaPequeno(r: r)
                }
            } else {
                SemConexao().padding(16)
            }
        }
        .modifier(Fundo(familia: familia))
    }
}

struct SemanaPequeno: View {
    var r: Resumo
    var body: some View {
        let cor = Tema.mint(r)
        VStack(spacing: 8) {
            Kicker(texto: "Semana", cor: cor).frame(maxWidth: .infinity, alignment: .leading)
            Anel(pct: r.semana.pct, cor: cor).frame(width: 80, height: 80)
            Text("\(r.semana.feitasPrevistas) de \(r.semana.previstas) feitas")
                .font(.system(size: 12)).foregroundStyle(Tema.fog)
        }
        .padding(16)
        .widgetURL(Atalho.seuDia)
    }
}

struct SemanaMedio: View {
    var r: Resumo
    var body: some View {
        let cor = Tema.mint(r)
        VStack(alignment: .leading, spacing: 10) {
            Kicker(texto: "Semana · \(Self.curto(r.semana.de)) a \(Self.curto(r.semana.ate))", cor: cor)
            BarrasSemana(semana: r.semana, hoje: r.data, cor: cor)
            HStack {
                Text("\(r.semana.concluidas) feitas · \(r.semana.pct.map { "\($0)%" } ?? "–") do previsto").foregroundStyle(Tema.fog)
                Spacer()
                Text("\(r.semana.publicados) publicado\(r.semana.publicados == 1 ? "" : "s")").foregroundStyle(Tema.paper)
            }
            .font(.system(size: 12))
        }
        .padding(16)
        .widgetURL(Atalho.seuDia)
    }
    static func curto(_ d: String) -> String {
        let p = d.split(separator: "-")
        return p.count == 3 ? "\(p[2])/\(p[1])" : d
    }
}

/// "Atrasadas": círculo da tela bloqueada com o número de tarefas atrasadas.
#if os(iOS)
struct AtrasadasWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "Atrasadas", provider: Provedor()) { e in
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 0) {
                    Text("\(e.resumo?.hoje.atrasadas ?? 0)").font(.system(size: 22, weight: .heavy))
                    Text("ATRASO").font(.system(size: 8, weight: .semibold)).opacity(0.7)
                }
            }
            .widgetURL(Atalho.abrir("/tarefas"))
            .containerBackground(for: .widget) { Color.clear }
        }
        .configurationDisplayName("Atrasadas")
        .description("Quantas tarefas estão atrasadas.")
        .supportedFamilies([.accessoryCircular])
    }
}
#endif

@main
struct VincitWidgets: WidgetBundle {
    var body: some Widget {
        SeuDiaWidget()
        SemanaWidget()
        #if os(iOS)
        AtrasadasWidget()
        #endif
    }
}
