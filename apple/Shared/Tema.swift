import SwiftUI

extension Color {
    init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespaces)
        if s.hasPrefix("#") { s.removeFirst() }
        let n = UInt64(s, radix: 16) ?? 0x6eefb6
        self.init(red: Double((n >> 16) & 255) / 255, green: Double((n >> 8) & 255) / 255, blue: Double(n & 255) / 255)
    }
}

/// Cores e letras do HUB (mesmos tokens do site).
enum Tema {
    static let ink = Color(hex: "#0c0c0d")
    static let panel = Color(hex: "#151517")
    static let panel2 = Color(hex: "#1c1c1f")
    static let line = Color(hex: "#2a2a2e")
    static let fog = Color(hex: "#8a8f94")
    static let paper = Color(hex: "#f1f1f1")
    static let red = Color(hex: "#ff6b6b")
    static let amber = Color(hex: "#ffc65c")

    /// cor de destaque da conta (verde por padrão)
    static func mint(_ r: Resumo?) -> Color { Color(hex: r?.cor ?? "#6eefb6") }

    static func titulo(_ size: CGFloat) -> Font { .system(size: size, weight: .heavy) }
    static func kicker(_ size: CGFloat = 10) -> Font { .system(size: size, weight: .bold, design: .monospaced) }
}

/// "V" verde + texto em caixa alta, como no site
struct Kicker: View {
    var texto: String
    var cor: Color
    var body: some View {
        HStack(spacing: 6) {
            Text("V")
                .font(.system(size: 10, weight: .heavy))
                .foregroundStyle(Tema.ink)
                .frame(width: 14, height: 14)
                .background(cor, in: RoundedRectangle(cornerRadius: 4))
            Text(texto.uppercased())
                .font(Tema.kicker())
                .tracking(1.4)
                .foregroundStyle(cor)
                .lineLimit(1)
        }
    }
}

/// selo arredondado ("2 atrasadas")
struct Selo: View {
    var texto: String
    var cor: Color
    var body: some View {
        Text(texto)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(cor)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(cor.opacity(0.12), in: Capsule())
            .overlay(Capsule().stroke(cor.opacity(0.3), lineWidth: 1))
    }
}

/// anel de progresso da semana
struct Anel: View {
    var pct: Int?
    var cor: Color
    var espessura: CGFloat = 10
    var body: some View {
        ZStack {
            Circle().stroke(Color(hex: "#26262a"), lineWidth: espessura)
            Circle()
                .trim(from: 0, to: CGFloat(pct ?? 0) / 100)
                .stroke(cor, style: StrokeStyle(lineWidth: espessura, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text(pct.map { "\($0)%" } ?? "–")
                .font(Tema.titulo(20))
                .foregroundStyle(Tema.paper)
                .minimumScaleFactor(0.6)
        }
    }
}

/// barras da semana (feitas por dia)
struct BarrasSemana: View {
    var semana: Resumo.Semana
    var hoje: String
    var cor: Color
    private let nomes = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"]
    var body: some View {
        let dias = semana.dias ?? []
        let maior = max(1, dias.map { max($0.feitas, $0.previstas) }.max() ?? 1)
        HStack(alignment: .bottom, spacing: 6) {
            ForEach(Array(dias.enumerated()), id: \.offset) { i, d in
                VStack(spacing: 4) {
                    GeometryReader { g in
                        VStack(spacing: 0) {
                            Spacer(minLength: 0)
                            RoundedRectangle(cornerRadius: 4)
                                .fill(d.dia <= hoje ? cor : cor.opacity(0.25))
                                .frame(height: max(4, g.size.height * CGFloat(d.dia <= hoje ? d.feitas : d.previstas) / CGFloat(maior)))
                        }
                    }
                    Text(i < nomes.count ? nomes[i] : "")
                        .font(.system(size: 8, weight: .medium, design: .monospaced))
                        .foregroundStyle(Tema.fog)
                }
            }
        }
    }
}
