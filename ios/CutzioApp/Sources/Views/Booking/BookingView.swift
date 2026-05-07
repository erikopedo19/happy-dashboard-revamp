import SwiftUI

struct BookingView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.colorScheme) var colorScheme
    @State private var services: [ServiceModel] = []
    @State private var selectedServices: Set<String> = []
    @State private var selectedDate = Date()
    @State private var selectedTime = ""
    @State private var customerName = ""
    @State private var customerEmail = ""
    @State private var customerPhone = ""
    @State private var step: BookingStep = .services
    @State private var isLoading = false
    
    private var isDark: Bool { colorScheme == .dark }
    
    enum BookingStep: CaseIterable {
        case services, datetime, details, confirm
        
        var title: String {
            switch self {
            case .services: return "Select Services"
            case .datetime: return "Date & Time"
            case .details: return "Your Details"
            case .confirm: return "Confirm"
            }
        }
        
        var index: Int {
            switch self {
            case .services: return 0
            case .datetime: return 1
            case .details: return 2
            case .confirm: return 3
            }
        }
    }
    
    private var totalDuration: Int {
        services.filter { selectedServices.contains($0.id) }.reduce(0) { $0 + $1.duration }
    }
    
    private var totalPrice: Double {
        services.filter { selectedServices.contains($0.id) }.reduce(0.0) { $0 + ($1.price ?? 0) }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with progress
            headerView
            
            // Step Content
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 16) {
                    switch step {
                    case .services:
                        servicesStep
                    case .datetime:
                        dateTimeStep
                    case .details:
                        detailsStep
                    case .confirm:
                        confirmStep
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 100)
            }
            
            // Bottom Action Button
            bottomAction
        }
        .background {
            (isDark ? Color.black : Color(uiColor: .systemGroupedBackground))
                .ignoresSafeArea()
        }
        .task {
            await loadServices()
        }
    }
    
    // MARK: - Header
    private var headerView: some View {
        VStack(spacing: 12) {
            HStack {
                if step != .services {
                    Button {
                        withAnimation(.spring(response: 0.3)) {
                            goBack()
                        }
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.primary)
                    }
                }
                
                Spacer()
                
                Text(step.title)
                    .font(.system(size: 17, weight: .semibold))
                
                Spacer()
                
                if step != .services {
                    Color.clear.frame(width: 24)
                }
            }
            .padding(.horizontal, 16)
            
            // Progress bar
            HStack(spacing: 4) {
                ForEach(BookingStep.allCases, id: \.index) { s in
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(s.index <= step.index ? Color.green : (isDark ? Color.white.opacity(0.1) : Color.black.opacity(0.06)))
                        .frame(height: 3)
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.vertical, 12)
        .background {
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea(edges: .top)
        }
    }
    
    // MARK: - Services Step
    private var servicesStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Choose one or more services")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .padding(.top, 8)
            
            ForEach(services) { service in
                serviceRow(service)
            }
        }
    }
    
    private func serviceRow(_ service: ServiceModel) -> some View {
        let isSelected = selectedServices.contains(service.id)
        let color = Color.serviceColor(service.color)
        
        return Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                if isSelected {
                    selectedServices.remove(service.id)
                } else {
                    selectedServices.insert(service.id)
                }
            }
        } label: {
            HStack(spacing: 14) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(color.gradient)
                    .frame(width: 40, height: 40)
                    .overlay {
                        Image(systemName: "scissors")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(.white)
                    }
                
                VStack(alignment: .leading, spacing: 3) {
                    Text(service.name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(.primary)
                    
                    HStack(spacing: 6) {
                        Text("\(service.duration)min")
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
                
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(isSelected ? .green : .tertiary)
            }
            .padding(14)
            .liquidGlassCard(tintColor: isSelected ? color : .gray.opacity(0.3), cornerRadius: 18)
        }
        .buttonStyle(ScaleButtonStyle())
    }
    
    // MARK: - DateTime Step
    private var dateTimeStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Date picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Select Date")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                
                DatePicker("", selection: $selectedDate, in: Date()..., displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .tint(.green)
                    .padding(12)
                    .liquidGlassCard(cornerRadius: 20)
            }
            
            // Time slots
            VStack(alignment: .leading, spacing: 8) {
                Text("Select Time")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                    ForEach(generateTimeSlots(), id: \.self) { time in
                        Button {
                            withAnimation(.spring(response: 0.3)) {
                                selectedTime = time
                            }
                        } label: {
                            Text(time)
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .foregroundStyle(selectedTime == time ? (isDark ? .black : .white) : .primary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background {
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .fill(selectedTime == time ? (isDark ? .white : Color.primary) : Color.clear)
                                }
                                .overlay {
                                    if selectedTime != time {
                                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                                            .stroke(isDark ? Color.white.opacity(0.1) : Color.black.opacity(0.08), lineWidth: 1)
                                    }
                                }
                        }
                        .buttonStyle(ScaleButtonStyle())
                    }
                }
            }
        }
        .padding(.top, 8)
    }
    
    // MARK: - Details Step
    private var detailsStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Enter your information")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .padding(.top, 8)
            
            glassTextField(icon: "person.fill", placeholder: "Full Name", text: $customerName)
            glassTextField(icon: "envelope.fill", placeholder: "Email Address", text: $customerEmail)
            glassTextField(icon: "phone.fill", placeholder: "Phone Number", text: $customerPhone)
        }
    }
    
    private func glassTextField(icon: String, placeholder: String, text: Binding<String>) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .frame(width: 20)
            
            TextField(placeholder, text: text)
                .font(.system(size: 15))
        }
        .padding(14)
        .liquidGlassCard(cornerRadius: 16)
    }
    
    // MARK: - Confirm Step
    private var confirmStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Review your booking")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
                .padding(.top, 8)
            
            // Summary card
            VStack(alignment: .leading, spacing: 12) {
                // Services
                ForEach(services.filter { selectedServices.contains($0.id) }) { service in
                    HStack {
                        Circle()
                            .fill(Color.serviceColor(service.color).gradient)
                            .frame(width: 8, height: 8)
                        Text(service.name)
                            .font(.system(size: 14, weight: .medium))
                        Spacer()
                        if let price = service.price {
                            Text("$\(Int(price))")
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                
                Divider()
                
                // Date & Time
                HStack {
                    Image(systemName: "calendar")
                        .foregroundStyle(.secondary)
                    Text(selectedDate.formatted(.dateTime.weekday(.wide).month(.wide).day()))
                        .font(.system(size: 14))
                }
                
                HStack {
                    Image(systemName: "clock")
                        .foregroundStyle(.secondary)
                    Text(selectedTime)
                        .font(.system(size: 14))
                    Text("(\(totalDuration) min)")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }
                
                Divider()
                
                // Customer
                HStack {
                    Image(systemName: "person")
                        .foregroundStyle(.secondary)
                    Text(customerName)
                        .font(.system(size: 14))
                }
                
                Divider()
                
                // Total
                HStack {
                    Text("Total")
                        .font(.system(size: 16, weight: .semibold))
                    Spacer()
                    Text("$\(Int(totalPrice))")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                }
            }
            .padding(16)
            .liquidGlassCard(tintColor: .green, cornerRadius: 22)
        }
    }
    
    // MARK: - Bottom Action
    private var bottomAction: some View {
        VStack(spacing: 0) {
            Divider()
            
            HStack {
                if !selectedServices.isEmpty && step == .services {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(selectedServices.count) service\(selectedServices.count > 1 ? "s" : "")")
                            .font(.system(size: 13, weight: .medium))
                        Text("\(totalDuration)min · $\(Int(totalPrice))")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                }
                
                Spacer()
                
                Button {
                    withAnimation(.spring(response: 0.3)) {
                        goForward()
                    }
                } label: {
                    Text(step == .confirm ? "Book Now" : "Continue")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(isDark ? .black : .white)
                        .padding(.horizontal, 28)
                        .padding(.vertical, 13)
                        .background {
                            Capsule()
                                .fill(canProceed ? (isDark ? .white : Color.primary) : Color.gray.opacity(0.3))
                        }
                }
                .disabled(!canProceed)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(.ultraThinMaterial)
        }
    }
    
    // MARK: - Helpers
    private var canProceed: Bool {
        switch step {
        case .services: return !selectedServices.isEmpty
        case .datetime: return !selectedTime.isEmpty
        case .details: return !customerName.isEmpty && !customerEmail.isEmpty
        case .confirm: return true
        }
    }
    
    private func goForward() {
        switch step {
        case .services: step = .datetime
        case .datetime: step = .details
        case .details: step = .confirm
        case .confirm: submitBooking()
        }
    }
    
    private func goBack() {
        switch step {
        case .services: break
        case .datetime: step = .services
        case .details: step = .datetime
        case .confirm: step = .details
        }
    }
    
    private func generateTimeSlots() -> [String] {
        var slots: [String] = []
        for hour in 8...18 {
            slots.append(String(format: "%02d:00", hour))
            slots.append(String(format: "%02d:30", hour))
        }
        return slots
    }
    
    private func submitBooking() {
        isLoading = true
        // TODO: Submit to Supabase
        isLoading = false
    }
    
    private func loadServices() async {
        guard let userId = authManager.userId else { return }
        do {
            services = try await SupabaseManager.shared.fetchServices(userId: userId)
        } catch {
            print("Error loading services: \(error)")
        }
    }
}

#Preview {
    BookingView()
        .environmentObject(AuthManager())
        .environmentObject(ThemeManager())
}
