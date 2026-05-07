import Foundation
import SwiftUI
import Supabase

@MainActor
class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var userId: String?
    @Published var userEmail: String?
    @Published var isLoading = true
    
    private let supabase = SupabaseManager.shared.client
    
    init() {
        Task {
            await checkSession()
        }
    }
    
    func checkSession() async {
        do {
            let session = try await supabase.auth.session
            userId = session.user.id.uuidString
            userEmail = session.user.email
            isAuthenticated = true
        } catch {
            isAuthenticated = false
        }
        isLoading = false
    }
    
    func signIn(email: String, password: String) async throws {
        let session = try await supabase.auth.signIn(
            email: email,
            password: password
        )
        userId = session.user.id.uuidString
        userEmail = session.user.email
        isAuthenticated = true
    }
    
    func signOut() async throws {
        try await supabase.auth.signOut()
        userId = nil
        userEmail = nil
        isAuthenticated = false
    }
}
