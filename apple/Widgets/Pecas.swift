import AppIntents
import WidgetKit
import SwiftUI

/// linha de tarefa com o círculo que conclui (iOS 17 / macOS 14)
struct LinhaTarefa: View {
    var t: Resumo.Tarefa
    var fonte: CGFloat = 13
    var body: some View {
        HStack(spacing: 8) {
            Button(intent: ConcluirTarefa(id: t.id)) {
                Circle()
                    .strokeBorder(t.atrasada ? Tema.red : Color(hex: "#4a4f55"), lineWidth: 1.5)
                    .frame(width: 16, height: 16)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            Link(destination: Atalho.tarefa(t.id)) {
                HStack(spacing: 6) {
                    Text(t.titulo)
                        .font(.system(size: fonte))
                        .foregroundStyle(Tema.paper)
                        .lineLimit(1)
                    Spacer(minLength: 4)
                    Text(t.quando)
                        .font(.system(size: fonte - 2, weight: .medium, design: .monospaced))
                        .foregroundStyle(t.atrasada ? Tema.red : Tema.fog)
                }
            }
        }
    }
}

/// caixa do próximo compromisso
struct CaixaProximo: View {
    var p: Resumo.Compromisso
    var cor: Color
    var agora: Date
    var compacta = false
    var body: some View {
        HStack(spacing: 0) {
            Rectangle().fill(cor).frame(width: 3)
            VStack(alignment: .leading, spacing: 3) {
                Text((compacta ? p.hora : "\(p.hora)\(p.local.map { " · \($0)" } ?? "")").uppercased())
                    .font(Tema.kicker())
                    .foregroundStyle(cor)
                    .lineLimit(1)
                Text(p.titulo)
                    .font(.system(size: compacta ? 15 : 14, weight: compacta ? .heavy : .semibold))
                    .foregroundStyle(Tema.paper)
                    .lineLimit(2)
                if compacta {
                    Text([p.local, Resumo.falta(ate: p.inicioDate, de: agora)].compactMap { $0 }.joined(separator: " · "))
                        .font(.system(size: 11))
                        .foregroundStyle(Tema.fog)
                        .lineLimit(2)
                }
            }
            .padding(.horizontal, 10).padding(.vertical, 8)
            Spacer(minLength: 0)
        }
        .background(Tema.panel2)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

/// quando não há conta conectada
struct SemConexao: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Kicker(texto: "VINCIT HUB", cor: Tema.mint(nil))
            Spacer(minLength: 0)
            Text("Abra o app e conecte sua conta.")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Tema.paper)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(Atalho.seuDia)
    }
}

extension View {
    /// fundo escuro do HUB nos widgets da tela inicial e da mesa
    func fundoHub() -> some View {
        containerBackground(for: .widget) { Tema.panel }
    }
}
