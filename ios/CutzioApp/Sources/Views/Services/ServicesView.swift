import SwiftUI

struct ServicesView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.colorScheme) var colorScheme
    @State private var services: [ServiceModel] = []
    @State private var isLoading = true
    
    private var isDark: Bool { colorScheme == .dark }
    
    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 16) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Services")
                            .font(.system(size: 28, weight: .bold))
                        Text("Manage your salon services")
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    
                    Button {
                        // TODO: Add service
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(isDark ? .black : .white)
                            .frame(width: 36, height: 36)
                            .background {
                                Circle()
                                    .fill(isDark ? .white : Color.primary)
                            }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                
                // Services List
                if isLoading {
                    ForEach(0..<4, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .fill(.ultraThinMaterial)
                            .frame(height: 80)
                            .padding(.horizontal, 16)
                            .redacted(reason: .placeholder)
                    }
                } else if services.isEmpty {
                    emptyState
                } else {
                    LazyVStack(spacing: 10) {
                        ForEach(services) { service in
                            serviceCard(service)
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            .padding(.bottom, 100)
        }
        .background {
            (isDark ? Color.black : Color(uiColor: .systemGroupedBackground))
                .ignoresSafeArea()
        }
        .task {
            await loadServices()
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "scissors")
                .font(.system(size: 40, weight: .light))
                .foregroundStyle(.tertiary)
            
            Text("No services yet")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(.secondary)
            
            Text("Add your first service to get started")
                .font(.system(size: 13))
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
    }
    
    private func serviceCard(_ service: ServiceModel) -> some View {
        let color = Color.serviceColor(service.color)
        
        return HStack(spacing: 14) {
            // Color icon
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(color.gradient)
                .frame(width: 44, height: 44)
                .overlay {
                    Image(systemName: "scissors")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(.white)
                }
            
            // Info
            VStack(alignment: .leading, spacing: 3) {
                Text(service.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.primary)
                
                HStack(spacing: 8) {
                    Label("\(service.duration)min", systemImage: "clock")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                    
                    if let price = service.price {
                        Text("$\(Int(price))")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.tertiary)
        }
        .padding(14)
        .liquidGlassCard(tintColor: color, cornerRadius: 20)
    }
    
    private func loadServices() async {
        guard let userId = authManager.userId else { return }
        isLoading = true
        defer { isLoading = false }
        
        do {
            services = try await SupabaseManager.shared.fetchServices(userId: userId)
        } catch {
            print("Error loading services: \(error)")
        }
    }
}

#Preview {
    ServicesView()
        .environmentObject(AuthManager())
        .environmentObject(ThemeManager())
}
