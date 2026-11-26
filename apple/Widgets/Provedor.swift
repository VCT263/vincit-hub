import WidgetKit
import SwiftUI

struct Entrada: TimelineEntry {
    let date: Date
    let resumo: Resumo?
    let conectado: Bool
}

/// Busca o resumo no HUB a cada 15 minutos; sem internet, usa o último que baixou.
struct Provedor: TimelineProvider {
    func placeholder(in context: Context) -> Entrada {
        Entrada(date: Date(), resumo: .exemplo, conectado: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entrada) -> Void) {
        if context.isPreview || !Conta.conectado {
            completion(Entrada(date: Date(), resumo: .exemplo, conectado: true))
        } else {
            completion(Entrada(date: Date(), resumo: Conta.cache ?? .exemplo, conectado: true))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entrada>) -> Void) {
        Task {
            let agora = Date()
            guard Conta.conectado else {
                completion(Timeline(entries: [Entrada(date: agora, resumo: nil, conectado: false)], policy: .after(agora.addingTimeInterval(3600))))
                return
            }
            let r = (try? await API.resumo()) ?? Conta.cache
            // uma entrada a cada 15 min: a contagem regressiva do próximo compromisso anda sem novo download
            let entradas = (0..<4).map { i in Entrada(date: agora.addingTimeInterval(Double(i) * 900), resumo: r, conectado: true) }
            completion(Timeline(entries: entradas, policy: .atEnd))
        }
    }
}

/// links que o app entende
enum Atalho {
    static func abrir(_ caminho: String) -> URL {
        var c = URLComponents(string: "vincithub://abrir")!
        c.queryItems = [URLQueryItem(name: "p", value: caminho)]
        return c.url!
    }
    static let seuDia = abrir("/")
    static let nova = URL(string: "vincithub://nova")!
    static func tarefa(_ id: String) -> URL { abrir("/tarefas?t=\(id)") }
}
