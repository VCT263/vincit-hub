import SwiftUI
import WidgetKit

/// Estado do app: conta, resumo e ações. Toda mudança atualiza os widgets e os avisos.
@MainActor
final class Modelo: ObservableObject {
    @Published var resumo: Resumo? = Conta.cache
    @Published var conectado = Conta.conectado
    @Published var carregando = false
    @Published var erro: String?
    @Published var pedirNovaTarefa = false

    func atualizar() async {
        guard Conta.conectado else { conectado = false; return }
        carregando = true
        defer { carregando = false }
        do {
            let r = try await API.resumo()
            resumo = r
            erro = nil
            WidgetCenter.shared.reloadAllTimelines()
            await Avisos.agendar(r)
        } catch {
            erro = error.localizedDescription
        }
    }

    func conectar(_ texto: String) async -> Bool {
        guard Conta.conectar(texto) else {
            erro = "Esse link não é o de conexão. Em Minha conta no HUB, toque em Conectar o app VINCIT HUB."
            return false
        }
        conectado = true
        erro = nil
        await atualizar()
        if erro == nil { await Avisos.pedirPermissao() }
        return erro == nil
    }

    func desconectar() {
        Conta.desconectar()
        resumo = nil
        conectado = false
        WidgetCenter.shared.reloadAllTimelines()
        Avisos.limpar()
    }

    func concluir(_ t: Resumo.Tarefa) async {
        resumo?.concluir(t.id)
        Conta.cache = resumo
        WidgetCenter.shared.reloadAllTimelines()
        do { try await API.concluir(t.id) } catch { erro = error.localizedDescription }
        await atualizar()
    }

    func criar(_ titulo: String, hoje: Bool) async {
        let t = titulo.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty else { return }
        do { try await API.criar(t, data: hoje ? resumo?.data : nil) } catch { erro = error.localizedDescription }
        await atualizar()
    }

    /// vincithub://conectar?u=…, vincithub://abrir?p=/caminho, vincithub://nova
    func abrir(_ url: URL) {
        guard url.scheme == "vincithub" else { return }
        let q = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        switch url.host {
        case "conectar":
            Task { _ = await conectar(url.absoluteString) }
        case "abrir":
            let p = q.first(where: { $0.name == "p" })?.value ?? "/"
            if p == "/" { Task { await atualizar() } } else { abrirNoNavegador(p) }
        case "nova":
            pedirNovaTarefa = true
        default:
            break
        }
    }

    func abrirNoNavegador(_ caminho: String) {
        let u = Conta.web(caminho)
        #if os(iOS)
        UIApplication.shared.open(u)
        #else
        NSWorkspace.shared.open(u)
        #endif
    }

    /// texto da barra de menus do Mac: "3 · Gravação 14:00"
    var rotuloMenu: String {
        guard let r = resumo else { return "HUB" }
        var s = "\(r.hoje.abertas)"
        if let p = r.proximo, p.dia == r.data { s += " · \(p.titulo) \(p.hora)" }
        return s
    }
}
