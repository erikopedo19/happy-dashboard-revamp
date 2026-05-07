import Foundation

// MARK: - Service
struct ServiceModel: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let duration: Int
    let color: String?
    let price: Double?
    let icon: String?
    let userId: String?
    
    enum CodingKeys: String, CodingKey {
        case id, name, duration, color, price, icon
        case userId = "user_id"
    }
    
    var displayColor: String {
        color ?? "#22c55e"
    }
}

// MARK: - Customer
struct CustomerModel: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let email: String?
    let phone: String?
}

// MARK: - Stylist
struct StylistModel: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let email: String?
    let title: String?
    let avatarUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id, name, email, title
        case avatarUrl = "avatar_url"
    }
}

// MARK: - Appointment
struct AppointmentModel: Codable, Identifiable {
    let id: String
    let appointmentDate: String
    let appointmentTime: String
    let status: String
    let price: Double?
    let notes: String?
    let customer: CustomerModel
    let service: ServiceModel
    let stylist: StylistModel?
    
    enum CodingKeys: String, CodingKey {
        case id, status, price, notes, customer, service, stylist
        case appointmentDate = "appointment_date"
        case appointmentTime = "appointment_time"
    }
    
    var startDate: Date {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.date(from: "\(appointmentDate) \(appointmentTime.prefix(5))") ?? Date()
    }
    
    var endDate: Date {
        startDate.addingTimeInterval(TimeInterval(service.duration * 60))
    }
    
    var timeString: String {
        String(appointmentTime.prefix(5))
    }
    
    var isCompleted: Bool {
        status == "completed"
    }
}

// MARK: - Agenda Settings
struct AgendaSettings: Codable {
    let startHour: String?
    let endHour: String?
    let serviceDuration: Int?
    
    enum CodingKeys: String, CodingKey {
        case startHour = "start_hour"
        case endHour = "end_hour"
        case serviceDuration = "service_duration"
    }
}

// MARK: - User Profile
struct UserProfile: Codable {
    let id: String
    let fullName: String?
    let email: String?
    let avatarUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case email
        case avatarUrl = "avatar_url"
    }
}
