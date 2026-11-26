import Foundation

/// Resposta de GET /api/resumo (mesmos dados do Seu dia no HUB).
struct Resumo: Codable, Equatable {
    var ok: Bool
    var geradoEm: String?
    var data: String
    var saudacao: String
    var hoje: Hoje
    var tarefas: [Tarefa]
    var publicar: [String]
    var agenda: [Compromisso]
    var proximo: Compromisso?
    var semana: Semana
    var avisos: Int
    var url: String
    var cor: String?

    struct Hoje: Codable, Equatable {
        var abertas: Int
        var atrasadas: Int
        var paraHoje: Int
        var concluidas: Int
        var publicar: Int
    }

    struct Tarefa: Codable, Equatable, Identifiable {
        var id: String
        var titulo: String
        var hora: String
        var atrasada: Bool
        var dias: Int?

        /// "ontem", "3 dias" para atrasadas; a hora para as de hoje
        var quando: String {
            if atrasada {
                let d = dias ?? 1
                return d <= 1 ? "ontem" : "\(d) dias"
            }
            return hora
        }
    }

    struct Compromisso: Codable, Equatable {
        var dia: String
        var hora: String
        var inicio: String?
        var titulo: String
        var tipo: String
        var local: String?

        var inicioDate: Date? {
            if let inicio, let d = ISO8601DateFormatter().date(from: inicio) { return d }
            return ISO8601DateFormatter().date(from: "\(dia)T\(hora):00-03:00")
        }
    }

    struct Semana: Codable, Equatable {
        var de: String
        var ate: String
        var concluidas: Int
        var previstas: Int
        var feitasPrevistas: Int
        var pct: Int?
        var publicados: Int
        var dias: [Dia]?
    }

    struct Dia: Codable, Equatable {
        var dia: String
        var feitas: Int
        var previstas: Int
    }

    static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }()

    /// marca a tarefa como feita no cache, para o widget responder na hora
    mutating func concluir(_ id: String) {
        guard let i = tarefas.firstIndex(where: { $0.id == id }) else { return }
        let t = tarefas.remove(at: i)
        hoje.abertas = max(0, hoje.abertas - 1)
        if t.atrasada { hoje.atrasadas = max(0, hoje.atrasadas - 1) } else { hoje.paraHoje = max(0, hoje.paraHoje - 1) }
        hoje.concluidas += 1
        semana.concluidas += 1
    }

    /// dados de exemplo para a galeria de widgets
    static let exemplo: Resumo = {
        let json = """
        {"ok":true,"data":"2026-11-26","saudacao":"Bom dia, Vinícius",
         "hoje":{"abertas":5,"atrasadas":2,"para_hoje":3,"concluidas":1,"publicar":2},
         "tarefas":[{"id":"a","titulo":"Aprovar roteiro Black Friday","hora":"","atrasada":true,"dias":1},
                    {"id":"b","titulo":"Enviar orçamento ISYS","hora":"","atrasada":true,"dias":2},
                    {"id":"c","titulo":"Editar reels ISYS","hora":"11:00","atrasada":false,"dias":0},
                    {"id":"d","titulo":"Responder cliente","hora":"15:30","atrasada":false,"dias":0},
                    {"id":"e","titulo":"Revisar legenda carrossel","hora":"17:00","atrasada":false,"dias":0}],
         "publicar":["Carrossel Black Friday","Reels bastidores"],
         "agenda":[{"dia":"2026-11-26","hora":"14:00","titulo":"Gravação ISYS","tipo":"Captação","local":"Estúdio"}],
         "proximo":{"dia":"2026-11-26","hora":"14:00","titulo":"Gravação ISYS","tipo":"Captação","local":"Estúdio"},
         "semana":{"de":"2026-11-23","ate":"2026-11-29","concluidas":8,"previstas":13,"feitas_previstas":8,"pct":62,"publicados":3,
                   "dias":[{"dia":"2026-11-23","feitas":3,"previstas":3},{"dia":"2026-11-24","feitas":4,"previstas":4},
                           {"dia":"2026-11-25","feitas":2,"previstas":2},{"dia":"2026-11-26","feitas":1,"previstas":3},
                           {"dia":"2026-11-27","feitas":0,"previstas":2},{"dia":"2026-11-28","feitas":0,"previstas":0},
                           {"dia":"2026-11-29","feitas":0,"previstas":0}]},
         "avisos":3,"url":"https://vincit-hub.vercel.app/","cor":"#6eefb6"}
        """
        return try! decoder.decode(Resumo.self, from: Data(json.utf8))
    }()
}

extension Resumo {
    /// "quinta, 26"
    var diaCurto: String {
        let p = DateFormatter()
        p.dateFormat = "yyyy-MM-dd"
        p.timeZone = TimeZone(identifier: "America/Sao_Paulo")
        guard let d = p.date(from: data) else { return "" }
        let f = DateFormatter()
        f.locale = Locale(identifier: "pt_BR")
        f.timeZone = TimeZone(identifier: "America/Sao_Paulo")
        f.dateFormat = "EEEE, d"
        return f.string(from: d).replacingOccurrences(of: "-feira", with: "")
    }

    /// "em 3h15", "em 20 min", "agora"
    static func falta(ate alvo: Date?, de agora: Date = Date()) -> String? {
        guard let alvo else { return nil }
        let min = Int(alvo.timeIntervalSince(agora) / 60)
        if min < 0 { return nil }
        if min < 1 { return "agora" }
        if min < 60 { return "em \(min) min" }
        let h = min / 60, m = min % 60
        if h >= 24 { return nil }
        return m == 0 ? "em \(h)h" : "em \(h)h\(String(format: "%02d", m))"
    }
}
