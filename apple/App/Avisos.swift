import Foundation
import UserNotifications

/// Avisos locais do app: resumo às 8:00 e lembrete 15 minutos antes de cada compromisso.
/// São agendados no próprio aparelho a cada atualização, sem servidor de push.
enum Avisos {
    private static let prefixo = "hub-"

    static func pedirPermissao() async {
        _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
    }

    static func limpar() {
        let c = UNUserNotificationCenter.current()
        c.getPendingNotificationRequests { reqs in
            c.removePendingNotificationRequests(withIdentifiers: reqs.map(\.identifier).filter { $0.hasPrefix(prefixo) })
        }
    }

    static func agendar(_ r: Resumo) async {
        let c = UNUserNotificationCenter.current()
        let ajustes = await c.notificationSettings()
        let pendentes = await c.pendingNotificationRequests()
        c.removePendingNotificationRequests(withIdentifiers: pendentes.map(\.identifier).filter { $0.hasPrefix(prefixo) })
        guard Conta.avisos, ajustes.authorizationStatus == .authorized || ajustes.authorizationStatus == .provisional else { return }

        let agora = Date()
        // compromissos dos próximos dias (até 20)
        var vistos = Set<String>()
        for p in ([r.proximo].compactMap { $0 } + r.agenda).prefix(20) {
            guard let d = p.inicioDate else { continue }
            let quando = d.addingTimeInterval(-15 * 60)
            let id = "\(prefixo)\(p.dia)-\(p.hora)-\(p.titulo)"
            guard quando > agora, !vistos.contains(id) else { continue }
            vistos.insert(id)
            let n = UNMutableNotificationContent()
            n.title = p.titulo
            n.body = "Em 15 min\(p.local.map { " · \($0)" } ?? "") · \(p.tipo)"
            n.sound = .default
            n.userInfo = ["url": "vincithub://abrir?p=%2F"]
            let gatilho = UNTimeIntervalNotificationTrigger(timeInterval: quando.timeIntervalSince(agora), repeats: false)
            try? await c.add(UNNotificationRequest(identifier: id, content: n, trigger: gatilho))
        }

        // resumo da manhã (próximas 8:00)
        let n = UNMutableNotificationContent()
        n.title = "Bom dia!"
        var partes = ["\(r.hoje.abertas) tarefa\(r.hoje.abertas == 1 ? "" : "s") em aberto"]
        if r.hoje.atrasadas > 0 { partes.append("\(r.hoje.atrasadas) atrasada\(r.hoje.atrasadas == 1 ? "" : "s")") }
        if r.hoje.publicar > 0 { partes.append("\(r.hoje.publicar) post\(r.hoje.publicar == 1 ? "" : "s") para publicar") }
        n.body = partes.joined(separator: ", ") + ". Toque para ver o seu dia."
        n.sound = .default
        var hora = DateComponents()
        hora.hour = 8
        hora.minute = 0
        try? await c.add(UNNotificationRequest(identifier: "\(prefixo)manha", content: n, trigger: UNCalendarNotificationTrigger(dateMatching: hora, repeats: false)))
    }
}
