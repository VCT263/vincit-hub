import SwiftUI
#if os(iOS)
import BackgroundTasks
#endif

@main
struct VincitHubApp: App {
    @StateObject private var modelo = Modelo()
    @Environment(\.scenePhase) private var fase

    var body: some Scene {
        WindowGroup {
            Inicio()
                .environmentObject(modelo)
                .preferredColorScheme(.dark)
                .tint(Tema.mint(modelo.resumo))
                .onOpenURL { modelo.abrir($0) }
                .task { await modelo.atualizar() }
        }
        #if os(macOS)
        .defaultSize(width: 420, height: 720)
        #endif
        .onChange(of: fase) { _, nova in
            if nova == .active { Task { await modelo.atualizar() } }
            #if os(iOS)
            if nova == .background { Self.agendarAtualizacao() }
            #endif
        }
        #if os(iOS)
        .backgroundTask(.appRefresh(Self.tarefaFundo)) {
            Self.agendarAtualizacao()
            _ = try? await API.resumo()
            if let r = Conta.cache { await Avisos.agendar(r) }
        }
        #endif

        #if os(macOS)
        MenuBarExtra {
            PainelRapido()
                .environmentObject(modelo)
                .preferredColorScheme(.dark)
        } label: {
            Label(modelo.rotuloMenu, systemImage: "diamond.fill")
                .labelStyle(.titleAndIcon)
        }
        .menuBarExtraStyle(.window)
        #endif
    }

    #if os(iOS)
    static let tarefaFundo = "com.vincit.hub.refresh"

    /// pede ao iPhone para atualizar o resumo e os avisos em segundo plano (~30 min)
    static func agendarAtualizacao() {
        let r = BGAppRefreshTaskRequest(identifier: tarefaFundo)
        r.earliestBeginDate = Date().addingTimeInterval(30 * 60)
        try? BGTaskScheduler.shared.submit(r)
    }
    #endif
}
