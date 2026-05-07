import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var themeManager: ThemeManager
    @State private var selectedTab: Tab = .agenda
    
    enum Tab: String, CaseIterable {
        case dashboard = "Dashboard"
        case agenda = "Agenda"
        case services = "Services"
        case booking = "Booking"
        case settings = "Settings"
        
        var icon: String {
            switch self {
            case .dashboard: return "square.grid.2x2.fill"
            case .agenda: return "calendar"
            case .services: return "scissors"
            case .booking: return "plus.circle.fill"
            case .settings: return "gearshape.fill"
            }
        }
    }
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                mainTabView
            } else {
                LoginView()
            }
        }
    }
    
    private var mainTabView: some View {
        ZStack(alignment: .bottom) {
            // Main content
            Group {
                switch selectedTab {
                case .dashboard:
                    DashboardView()
                case .agenda:
                    AgendaView()
                case .services:
                    ServicesView()
                case .booking:
                    BookingView()
                case .settings:
                    SettingsView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
            // Liquid Glass Tab Bar
            LiquidGlassTabBar(selectedTab: $selectedTab)
        }
        .ignoresSafeArea(.keyboard)
    }
}

// MARK: - Liquid Glass Tab Bar
struct LiquidGlassTabBar: View {
    @Binding var selectedTab: ContentView.Tab
    @Environment(\.colorScheme) var colorScheme
    
    private var isDark: Bool { colorScheme == .dark }
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(ContentView.Tab.allCases, id: \.self) { tab in
                tabButton(tab)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 8)
        .background {
            // Liquid glass background
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay {
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .stroke(
                            isDark
                                ? Color.white.opacity(0.12)
                                : Color.black.opacity(0.06),
                            lineWidth: 0.5
                        )
                }
                .shadow(color: .black.opacity(isDark ? 0.4 : 0.1), radius: 20, y: 5)
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 4)
    }
    
    private func tabButton(_ tab: ContentView.Tab) -> some View {
        Button {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                selectedTab = tab
            }
        } label: {
            VStack(spacing: 4) {
                Image(systemName: tab.icon)
                    .font(.system(size: tab == .booking ? 24 : 18, weight: .medium))
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(
                        selectedTab == tab
                            ? (isDark ? .white : .primary)
                            : .secondary
                    )
                    .scaleEffect(selectedTab == tab ? 1.1 : 1.0)
                
                if tab != .booking {
                    Text(tab.rawValue)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(
                            selectedTab == tab
                                ? (isDark ? .white : .primary)
                                : .secondary
                        )
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .background {
                if selectedTab == tab {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(isDark ? Color.white.opacity(0.08) : Color.black.opacity(0.04))
                }
            }
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthManager())
        .environmentObject(ThemeManager())
}
