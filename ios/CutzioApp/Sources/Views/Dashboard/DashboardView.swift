import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.colorScheme) var colorScheme
    @State private var todayCount = 0
    @State private var weekRevenue = 0.0
    @State private var totalCustomers = 0
    @State private var pendingCount = 0
    
    private var isDark: Bool { colorScheme == .dark }
    
    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                // Header
                headerSection
                
                // Stats Grid
                statsGrid
                
                // Quick Actions
                quickActions
                
                // Recent Activity
                recentActivity
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 100)
        }
        .background {
            (isDark ? Color.black : Color(uiColor: .systemGroupedBackground))
                .ignoresSafeArea()
        }
    }
    
    // MARK: - Header
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Good \(greetingTime)")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(.secondary)
                
                Text("Dashboard")
                    .font(.system(size: 28, weight: .bold))
            }
            
            Spacer()
            
            // Profile avatar
            Circle()
                .fill(.ultraThinMaterial)
                .frame(width: 40, height: 40)
                .overlay {
                    Image(systemName: "person.fill")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(.secondary)
                }
        }
        .padding(.top, 8)
    }
    
    private var greetingTime: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "morning" }
        if hour < 17 { return "afternoon" }
        return "evening"
    }
    
    // MARK: - Stats Grid
    private var statsGrid: some View {
        LazyVGrid(columns: [
            GridItem(.flexible(), spacing: 12),
            GridItem(.flexible(), spacing: 12)
        ], spacing: 12) {
            statCard(
                title: "Today",
                value: "\(todayCount)",
                subtitle: "appointments",
                icon: "calendar",
                tint: .blue
            )
            statCard(
                title: "Revenue",
                value: "$\(Int(weekRevenue))",
                subtitle: "this week",
                icon: "dollarsign.circle",
                tint: .green
            )
            statCard(
                title: "Customers",
                value: "\(totalCustomers)",
                subtitle: "total",
                icon: "person.2",
                tint: .purple
            )
            statCard(
                title: "Pending",
                value: "\(pendingCount)",
                subtitle: "to confirm",
                icon: "clock",
                tint: .orange
            )
        }
    }
    
    private func statCard(title: String, value: String, subtitle: String, icon: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(tint)
                    .frame(width: 32, height: 32)
                    .background {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(tint.opacity(isDark ? 0.15 : 0.1))
                    }
                
                Spacer()
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                
                Text(subtitle)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .liquidGlassCard(tintColor: tint, cornerRadius: 20)
    }
    
    // MARK: - Quick Actions
    private var quickActions: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .tracking(0.5)
            
            HStack(spacing: 12) {
                quickActionButton(icon: "plus.circle.fill", label: "New Booking", tint: .green)
                quickActionButton(icon: "person.badge.plus", label: "Add Customer", tint: .blue)
                quickActionButton(icon: "square.and.arrow.up", label: "Share Link", tint: .purple)
            }
        }
    }
    
    private func quickActionButton(icon: String, label: String, tint: Color) -> some View {
        Button {
            // TODO: Action
        } label: {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 22, weight: .medium))
                    .foregroundStyle(tint)
                
                Text(label)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .liquidGlassCard(tintColor: tint.opacity(0.5), cornerRadius: 18)
        }
        .buttonStyle(ScaleButtonStyle())
    }
    
    // MARK: - Recent Activity
    private var recentActivity: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Activity")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .tracking(0.5)
            
            VStack(spacing: 8) {
                activityRow(icon: "checkmark.circle.fill", text: "Haircut completed", time: "2h ago", tint: .green)
                activityRow(icon: "calendar.badge.plus", text: "New booking received", time: "4h ago", tint: .blue)
                activityRow(icon: "person.badge.plus", text: "New customer registered", time: "Yesterday", tint: .purple)
            }
            .padding(14)
            .liquidGlassCard(cornerRadius: 20)
        }
    }
    
    private func activityRow(icon: String, text: String, time: String, tint: Color) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(tint)
                .frame(width: 28)
            
            Text(text)
                .font(.system(size: 14))
                .foregroundStyle(.primary)
            
            Spacer()
            
            Text(time)
                .font(.system(size: 12))
                .foregroundStyle(.tertiary)
        }
    }
}

#Preview {
    DashboardView()
        .environmentObject(AuthManager())
        .environmentObject(ThemeManager())
}
