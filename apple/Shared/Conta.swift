import Foundation

/// Conexão com a conta do HUB, guardada no grupo do app para o app e os widgets lerem.
/// A conexão é o link pessoal do widget (…/api/resumo?k=<chave>), gerado em Minha conta.
enum Conta {
    /// grupo compartilhado entre o app e os widgets (no Mac leva o Team ID na frente; vem do Info.plist)
    static let grupo: String = {
        let g = Bundle.main.object(forInfoDictionaryKey: "VincitGrupo") as? String ?? ""
        return g.isEmpty || g.hasPrefix("$(") ? "group.com.vincit.hub" : g
    }()
    static let hubPadrao = URL(string: "https://vincit-hub.vercel.app")!

    static var defaults: UserDefaults { UserDefaults(suiteName: grupo) ?? .standard }

    private static let kLink = "link", kCache = "resumo", kAvisos = "avisos"

    /// link completo de resumo (com a chave)
    static var link: URL? {
        guard let s = defaults.string(forKey: kLink) else { return nil }
        return URL(string: s)
    }

    static var conectado: Bool { link != nil && chave != nil }

    static var chave: String? {
        guard let link, let c = URLComponents(url: link, resolvingAgainstBaseURL: false) else { return nil }
        return c.queryItems?.first(where: { $0.name == "k" })?.value
    }

    /// endereço do HUB (ex.: https://vincit-hub.vercel.app)
    static var base: URL {
        guard let link, var c = URLComponents(url: link, resolvingAgainstBaseURL: false) else { return hubPadrao }
        c.path = ""; c.query = nil; c.fragment = nil
        return c.url ?? hubPadrao
    }

    /// página do HUB, ex.: web("/tarefas?t=…")
    static func web(_ caminho: String) -> URL {
        URL(string: caminho, relativeTo: base)?.absoluteURL ?? base
    }

    /// aceita o link de conexão (https://…/api/resumo?k=…) ou o atalho vincithub://conectar?u=<link>
    @discardableResult
    static func conectar(_ texto: String) -> Bool {
        var s = texto.trimmingCharacters(in: .whitespacesAndNewlines)
        if let u = URLComponents(string: s), u.scheme == "vincithub", let inner = u.queryItems?.first(where: { $0.name == "u" })?.value {
            s = inner
        }
        guard let c = URLComponents(string: s), c.scheme == "https", c.path.hasSuffix("/api/resumo"),
              let k = c.queryItems?.first(where: { $0.name == "k" })?.value, k.split(separator: ".").count == 3 else { return false }
        defaults.set(s, forKey: kLink)
        defaults.removeObject(forKey: kCache)
        return true
    }

    static func desconectar() {
        defaults.removeObject(forKey: kLink)
        defaults.removeObject(forKey: kCache)
    }

    /// último resumo baixado (o widget usa quando está sem internet)
    static var cache: Resumo? {
        get {
            guard let d = defaults.data(forKey: kCache) else { return nil }
            return try? Resumo.decoder.decode(Resumo.self, from: d)
        }
        set {
            if let newValue, let d = try? Resumo.encoder.encode(newValue) { defaults.set(d, forKey: kCache) }
            else { defaults.removeObject(forKey: kCache) }
        }
    }

    /// avisos no celular ligados (padrão: sim)
    static var avisos: Bool {
        get { defaults.object(forKey: kAvisos) as? Bool ?? true }
        set { defaults.set(newValue, forKey: kAvisos) }
    }
}
