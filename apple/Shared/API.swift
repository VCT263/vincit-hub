import Foundation

enum ErroHub: LocalizedError {
    case desconectado
    case servidor(String)

    var errorDescription: String? {
        switch self {
        case .desconectado: return "Conecte o app em Minha conta no HUB."
        case .servidor(let m): return m
        }
    }
}

/// Conversa com o HUB usando a chave pessoal.
enum API {
    private struct Resposta: Decodable { var ok: Bool?; var error: String?; var id: String? }

    /// baixa o resumo e guarda no cache
    static func resumo() async throws -> Resumo {
        guard let link = Conta.link else { throw ErroHub.desconectado }
        var req = URLRequest(url: link, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 20)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, resp) = try await URLSession.shared.data(for: req)
        let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
        if status != 200 {
            let m = (try? JSONDecoder().decode(Resposta.self, from: data))?.error
            throw ErroHub.servidor(m ?? "O HUB não respondeu (\(status)).")
        }
        let r = try Resumo.decoder.decode(Resumo.self, from: data)
        Conta.cache = r
        return r
    }

    @discardableResult
    private static func acao(_ corpo: [String: String]) async throws -> String? {
        guard let chave = Conta.chave else { throw ErroHub.desconectado }
        var req = URLRequest(url: Conta.web("/api/resumo/acao"), timeoutInterval: 20)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(chave)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONSerialization.data(withJSONObject: corpo)
        let (data, _) = try await URLSession.shared.data(for: req)
        let r = try? JSONDecoder().decode(Resposta.self, from: data)
        if r?.ok != true { throw ErroHub.servidor(r?.error ?? "Não foi possível falar com o HUB.") }
        return r?.id
    }

    static func concluir(_ id: String) async throws { try await acao(["acao": "concluir", "id": id]) }
    static func reabrir(_ id: String) async throws { try await acao(["acao": "reabrir", "id": id]) }
    static func criar(_ titulo: String, data: String? = nil) async throws {
        var c = ["acao": "criar", "titulo": titulo]
        if let data { c["data"] = data }
        try await acao(c)
    }
}
