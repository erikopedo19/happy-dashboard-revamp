import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var themeManager: ThemeManager
    @Environment(\.colorScheme) var colorScheme
    @State private var slotDuration = 30
    @State private var startHour = "08:00"
    @State private var endHour = "18:00"
    @State private var notifyNewBookings = true
    @State private var notifyReminders = true
    @State private var notifyCancellations = true
    
    private var isDark: Bool { colorScheme == .dark }
    private let durationOptions = [10, 15, 20, 25, 30, 45, 60, 90]
    
    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 20) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Settings")
                            .font(.system(size: 28, weight: .bold))
                        Text("Manage your preferences")
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                
                // Theme Section
                themeSection
                
                // Slot Duration
                slotDurationSection
                
                // Working Hours
                workingHoursSection
                
                // Notifications
                notificationsSection
                
                // Account
                accountSection
            }
            .padding(.bottom, 100)
        }
        .background {
            (isDark ? Color.black : Color(uiColor: .systemGroupedBackground))
                .ignoresSafeArea()
        }
    }
    
    // MARK: - Theme Section
    private var themeSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Appearance")
            
            HStack(spacing: 10) {
                themeButton("Light", icon: "sun.max.fill", isSelected: themeManager.colorSchemePreference == "light") {
                    themeManager.colorSchemePreference = "light"
                }
                themeButton("Dark", icon: "moon.fill", isSelected: themeManager.colorSchemePreference == "dark") {
                    themeManager.colorSchemePreference = "dark"
                }
                themeButton("System", icon: "gear", isSelected: themeManager.colorSchemePreference == "system") {
                    themeManager.colorSchemePreference = "system"
                }
            }
            .padding(.horizontal, 16)
        }
    }
    
    private func themeButton(_ label: String, icon: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(isSelected ? (isDark ? .black : .white) : .secondary)
                
                Text(label)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(isSelected ? (isDark ? .black : .white) : .secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(isSelected ? (isDark ? .white : Color.primary) : Color.clear)
            }
            .overlay {
                if !isSelected {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(isDark ? Color.white.opacity(0.1) : Color.black.opacity(0.08), lineWidth: 1)
                }
            }
        }
        .buttonStyle(ScaleButtonStyle())
    }
    
    // MARK: - Slot Duration
    private var slotDurationSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Slot Duration")
            
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                ForEach(durationOptions, id: \.self) { duration in
                    Button {
                        withAnimation(.spring(response: 0.3)) {
                            slotDuration = duration
                        }
                    } label: {
                        Text("\(duration)m")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(slotDuration == duration ? (isDark ? .black : .white) : .primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background {
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .fill(slotDuration == duration ? (isDark ? .white : Color.primary) : Color.clear)
                            }
                            .overlay {
                                if slotDuration != duration {
                                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                                        .stroke(isDark ? Color.white.opacity(0.1) : Color.black.opacity(0.08), lineWidth: 1)
                                }
                            }
                    }
                    .buttonStyle(ScaleButtonStyle())
                }
            }
            .padding(.horizontal, 16)
        }
    }
    
    // MARK: - Working Hours
    private var workingHoursSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Working Hours")
            
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Opens at")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                    
                    Text(startHour)
                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .liquidGlassCard(tintColor: .green, cornerRadius: 18)
                
                VStack(alignment: .leading, spacing: 6) {
                    Text("Closes at")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                    
                    Text(endHour)
                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .liquidGlassCard(tintColor: .orange, cornerRadius: 18)
            }
            .padding(.horizontal, 16)
        }
    }
    
    // MARK: - Notifications
    private var notificationsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Notifications")
            
            VStack(spacing: 0) {
                notificationToggle("New Bookings", subtitle: "When appointments are booked", isOn: $notifyNewBookings)
                Divider().padding(.leading, 16)
                notificationToggle("Reminders", subtitle: "Before appointments start", isOn: $notifyReminders)
                Divider().padding(.leading, 16)
                notificationToggle("Cancellations", subtitle: "When appointments are cancelled", isOn: $notifyCancellations)
            }
            .padding(.vertical, 4)
            .liquidGlassCard(cornerRadius: 20)
            .padding(.horizontal, 16)
        }
    }
    
    private func notificationToggle(_ title: String, subtitle: String, isOn: Binding<Bool>) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Toggle("", isOn: isOn)
                .labelsHidden()
                .tint(.green)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
    
    // MARK: - Account
    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionLabel("Account")
            
            VStack(spacing: 0) {
                HStack {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(.secondary)
                    Text(authManager.userEmail ?? "User")
                        .font(.system(size: 14))
                    Spacer()
                }
                .padding(16)
                
                Divider().padding(.leading, 16)
                
                Button {
                    Task { try? await authManager.signOut() }
                } label: {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .font(.system(size: 16))
                            .foregroundStyle(.red)
                        Text("Sign Out")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(.red)
                        Spacer()
                    }
                    .padding(16)
                }
            }
            .liquidGlassCard(cornerRadius: 20)
            .padding(.horizontal, 16)
        }
    }
    
    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(.secondary)
            .textCase(.uppercase)
            .tracking(0.5)
            .padding(.horizontal, 16)
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthManager())
        .environmentObject(ThemeManager())
}
