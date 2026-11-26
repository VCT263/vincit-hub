import AppIntents
import WidgetKit

/// Toque no círculo da tarefa no widget: conclui sem abrir o app.
struct ConcluirTarefa: AppIntent {
    static var title: LocalizedStringResource = "Concluir tarefa"
    static var description = IntentDescription("Marca uma tarefa do HUB como feita.")
    static var openAppWhenRun = false
    static var isDiscoverable = false

    @Parameter(title: "Tarefa")
    var id: String

    init() {}
    init(id: String) { self.id = id }

    func perform() async throws -> some IntentResult {
        if var r = Conta.cache {
            r.concluir(id)
            Conta.cache = r
        }
        try? await API.concluir(id)
        _ = try? await API.resumo()
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
