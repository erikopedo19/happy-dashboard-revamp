import SwiftUI

struct AgendaView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.colorScheme) var colorScheme
    @StateObject private var viewModel = AgendaViewModel()
    @State private var selectedDay = Date()
    
    private var isDark: Bool { colorScheme == .dark }
    
    // Generate week days from current week
    private var weekDays: [Date] {
        let calendar = Calendar.current
        let weekStart = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: viewModel.currentWeek))!
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: weekStart) }
    }
    
    // Appointments for selected day
    private var dayAppointments: [AppointmentModel] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateStr = formatter.string(from: selectedDay)
        return viewModel.appointments
            .filter { $0.appointmentDate == dateStr }
            .sorted { $0.appointmentTime < $1.appointmentTime }
    }
    
    // Completion percentage
    private var completionPct: Int {
        guard !dayAppointments.isEmpty else { return 0 }
        let completed = dayAppointments.filter(\.isCompleted).count
        return Int(Double(completed) / Double(dayAppointments.count) * 100)
    }
    
    var body: some View {
        ZStack {
            // Background
            backgroundGradient
            
            VStack(spacing: 0) {
                // Week Day Selector Header
                weekDaySelector
                
                // Timeline Content
                if dayAppointments.isEmpty {
                    emptyState
                } else {
                    timelineView
                }
            }
        }
        .task {
            if let userId = authManager.userId {
                await viewModel.loadAppointments(userId: userId)
            }
        }
    }
    
    // MARK: - Background
    private var backgroundGradient: some View {
        Group {
            if isDark {
                Color.black
                    .overlay {
                        LinearGradient(
                            colors: [
                                Color(hex: "0a1a0a").opacity(0.8),
                                Color.black
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    }
            } else {
                Color(uiColor: .systemGroupedBackground)
            }
        }
        .ignoresSafeArea()
    }
    
    // MARK: - Week Day Selector
    private var weekDaySelector: some View {
        HStack(spacing: 0) {
            // Previous week
            Button {
                withAnimation(.spring(response: 0.3)) {
                    viewModel.currentWeek = Calendar.current.date(byAdding: .weekOfYear, value: -1, to: viewModel.currentWeek) ?? viewModel.currentWeek
                }
            } label: {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(.secondary)
                    .frame(width: 36, height: 36)
            }
            
            // Day buttons
            HStack(spacing: 2) {
                ForEach(weekDays, id: \.self) { day in
                    dayButton(day)
                }
            }
            .frame(maxWidth: .infinity)
            
            // Completion ring
            completionRing
                .frame(width: 36, height: 36)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background {
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea(edges: .top)
        }
    }
    
    private func dayButton(_ day: Date) -> some View {
        let isToday = Calendar.current.isDateInToday(day)
        let isSelected = Calendar.current.isDate(day, inSameDayAs: selectedDay)
        let hasAppts = viewModel.appointments.contains { apt in
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            return apt.appointmentDate == formatter.string(from: day)
        }
        
        return Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                selectedDay = day
            }
        } label: {
            VStack(spacing: 3) {
                Text(day.formatted(.dateTime.weekday(.narrow)))
                    .font(.system(size: 10, weight: .semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(isSelected ? (isDark ? .black : .white) : .secondary)
                
                Text(day.formatted(.dateTime.day()))
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(
                        isSelected
                            ? (isDark ? .black : .white)
                            : isToday ? .blue : .primary
                    )
                
                if hasAppts && !isSelected {
                    Circle()
                        .fill(.blue)
                        .frame(width: 4, height: 4)
                } else {
                    Spacer().frame(height: 4)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .background {
                if isSelected {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(isDark ? .white : Color.primary)
                }
            }
        }
        .buttonStyle(.plain)
    }
    
    private var completionRing: some View {
        ZStack {
            Circle()
                .stroke(isDark ? Color.gray.opacity(0.3) : Color.gray.opacity(0.2), lineWidth: 2.5)
            
            Circle()
                .trim(from: 0, to: CGFloat(completionPct) / 100)
                .stroke(Color.green, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                .rotationEffect(.degrees(-90))
            
            Text("\(completionPct)")
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .foregroundStyle(.primary)
        }
    }
    
    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            
            ZStack {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .frame(width: 80, height: 80)
                
                Image(systemName: "clock")
                    .font(.system(size: 32, weight: .light))
                    .foregroundStyle(.tertiary)
            }
            
            VStack(spacing: 4) {
                Text("No appointments")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(.secondary)
                
                Text(selectedDay.formatted(.dateTime.weekday(.wide).month(.wide).day()))
                    .font(.system(size: 13))
                    .foregroundStyle(.tertiary)
            }
            
            Button {
                // TODO: Navigate to booking
            } label: {
                Label("Book appointment", systemImage: "plus")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(isDark ? .black : .white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background {
                        Capsule()
                            .fill(isDark ? .white : Color.primary)
                    }
            }
            
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
    
    // MARK: - Timeline View
    private var timelineView: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(alignment: .leading, spacing: 0) {
                ForEach(generateHours(), id: \.self) { hour in
                    hourBlock(hour: hour)
                }
            }
            .padding(.bottom, 100) // Space for tab bar
        }
    }
    
    private func generateHours() -> [Int] {
        guard !dayAppointments.isEmpty else { return Array(8...18) }
        let hours = dayAppointments.compactMap { Int($0.appointmentTime.prefix(2)) }
        let minH = max((hours.min() ?? 8) - 1, 0)
        let maxH = min((hours.max() ?? 18) + 2, 23)
        return Array(minH...maxH)
    }
    
    private func hourBlock(hour: Int) -> some View {
        let hourAppts = dayAppointments.filter { Int($0.appointmentTime.prefix(2)) == hour }
        let isOccupied = dayAppointments.contains { apt in
            let startH = Int(apt.appointmentTime.prefix(2)) ?? 0
            let startM = Int(apt.appointmentTime.dropFirst(3).prefix(2)) ?? 0
            let startMin = startH * 60 + startM
            let endMin = startMin + apt.service.duration
            let hourStartMin = hour * 60
            return startMin < hourStartMin && endMin > hourStartMin
        }
        
        return VStack(alignment: .leading, spacing: 4) {
            // Time label + separator
            HStack(spacing: 12) {
                Text(formatHour(hour))
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(.tertiary)
                    .frame(width: 48, alignment: .trailing)
                
                Rectangle()
                    .fill(isDark ? Color.white.opacity(0.05) : Color.black.opacity(0.05))
                    .frame(height: 0.5)
            }
            .padding(.horizontal, 16)
            
            // Appointment cards for this hour
            ForEach(hourAppts) { apt in
                appointmentCard(apt)
                    .padding(.leading, 72)
                    .padding(.trailing, 16)
                    .padding(.vertical, 2)
            }
            
            // Empty slot (clickable)
            if hourAppts.isEmpty && !isOccupied {
                Color.clear
                    .frame(height: 24)
            }
        }
        .padding(.vertical, 4)
    }
    
    // MARK: - Appointment Card (Liquid Glass)
    private func appointmentCard(_ apt: AppointmentModel) -> some View {
        let color = Color.serviceColor(apt.service.color)
        let duration = apt.service.duration
        let slotsSpanned = max(Int(ceil(Double(duration) / 60.0)), 1)
        let minHeight: CGFloat = CGFloat(max(slotsSpanned * 64, 56))
        
        return Button {
            // TODO: Show appointment detail sheet
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                // Title row
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(apt.service.name)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(isDark ? .white : Color(uiColor: .label))
                            .lineLimit(1)
                        
                        HStack(spacing: 4) {
                            Image(systemName: "person.fill")
                                .font(.system(size: 10))
                                .foregroundStyle(isDark ? .white.opacity(0.5) : .secondary)
                            
                            Text(apt.customer.name)
                                .font(.system(size: 12))
                                .foregroundStyle(isDark ? .white.opacity(0.6) : .secondary)
                                .lineLimit(1)
                        }
                    }
                    
                    Spacer()
                    
                    // Status icon
                    if apt.isCompleted {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(.green)
                    } else {
                        Image(systemName: "bolt.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(isDark ? .white.opacity(0.4) : .secondary)
                    }
                }
                
                Spacer(minLength: 0)
                
                // Bottom: Time range + price
                HStack {
                    Text("\(apt.timeString) → \(apt.endDate.formatted(.dateTime.hour(.twoDigits(amPM: .abbreviated)).minute()))")
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(isDark ? .white.opacity(0.5) : .secondary)
                    
                    Spacer()
                    
                    if let price = apt.price {
                        Text("$\(Int(price))")
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                            .foregroundStyle(isDark ? .white.opacity(0.6) : .secondary)
                    }
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: minHeight, alignment: .topLeading)
            .liquidGlassCard(tintColor: color)
        }
        .buttonStyle(ScaleButtonStyle())
    }
    
    private func formatHour(_ hour: Int) -> String {
        if hour == 0 { return "12 AM" }
        if hour == 12 { return "12 PM" }
        if hour > 12 { return "\(hour - 12) PM" }
        return "\(hour) AM"
    }
}

// MARK: - Scale Button Style
struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

// MARK: - View Model
@MainActor
class AgendaViewModel: ObservableObject {
    @Published var appointments: [AppointmentModel] = []
    @Published var currentWeek = Date()
    @Published var isLoading = false
    
    func loadAppointments(userId: String) async {
        isLoading = true
        defer { isLoading = false }
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        let calendar = Calendar.current
        let start = calendar.date(byAdding: .month, value: -1, to: Date()) ?? Date()
        let end = calendar.date(byAdding: .month, value: 3, to: Date()) ?? Date()
        
        do {
            appointments = try await SupabaseManager.shared.fetchAppointments(
                userId: userId,
                startDate: formatter.string(from: start),
                endDate: formatter.string(from: end)
            )
        } catch {
            print("Error loading appointments: \(error)")
        }
    }
}

#Preview {
    AgendaView()
        .environmentObject(AuthManager())
        .environmentObject(ThemeManager())
}
