import Foundation
import Supabase

// MARK: - Supabase Configuration
// Replace these with your actual Supabase project credentials
enum SupabaseConfig {
    static let url = "https://YOUR_PROJECT_REF.supabase.co"
    static let anonKey = "YOUR_ANON_KEY"
}

@MainActor
class SupabaseManager: ObservableObject {
    static let shared = SupabaseManager()
    
    let client: SupabaseClient
    
    private init() {
        client = SupabaseClient(
            supabaseURL: URL(string: SupabaseConfig.url)!,
            supabaseKey: SupabaseConfig.anonKey
        )
    }
    
    // MARK: - Appointments
    func fetchAppointments(userId: String, startDate: String, endDate: String) async throws -> [AppointmentModel] {
        let response: [AppointmentModel] = try await client
            .from("appointments")
            .select("*, customer:customers(*), service:services(*), stylist:stylists(*)")
            .eq("user_id", value: userId)
            .gte("appointment_date", value: startDate)
            .lte("appointment_date", value: endDate)
            .order("appointment_date")
            .order("appointment_time")
            .execute()
            .value
        return response
    }
    
    func fetchAppointmentsForDate(userId: String, date: String) async throws -> [AppointmentModel] {
        let response: [AppointmentModel] = try await client
            .from("appointments")
            .select("*, customer:customers(*), service:services(*), stylist:stylists(*)")
            .eq("user_id", value: userId)
            .eq("appointment_date", value: date)
            .order("appointment_time")
            .execute()
            .value
        return response
    }
    
    func updateAppointmentStatus(id: String, status: String) async throws {
        try await client
            .from("appointments")
            .update(["status": status, "updated_at": ISO8601DateFormatter().string(from: Date())])
            .eq("id", value: id)
            .execute()
    }
    
    func deleteAppointment(id: String) async throws {
        try await client
            .from("appointments")
            .delete()
            .eq("id", value: id)
            .execute()
    }
    
    // MARK: - Services
    func fetchServices(userId: String) async throws -> [ServiceModel] {
        let response: [ServiceModel] = try await client
            .from("services")
            .select("*")
            .eq("user_id", value: userId)
            .order("name")
            .execute()
            .value
        return response
    }
    
    // MARK: - Customers
    func fetchCustomers(userId: String) async throws -> [CustomerModel] {
        let response: [CustomerModel] = try await client
            .from("customers")
            .select("*")
            .eq("user_id", value: userId)
            .order("name")
            .execute()
            .value
        return response
    }
    
    // MARK: - Settings
    func fetchAgendaSettings(userId: String) async throws -> AgendaSettings? {
        let response: [AgendaSettings] = try await client
            .from("agenda_settings")
            .select("start_hour, end_hour, service_duration")
            .eq("user_id", value: userId)
            .limit(1)
            .execute()
            .value
        return response.first
    }
}
