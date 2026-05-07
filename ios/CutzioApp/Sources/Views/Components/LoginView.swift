import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.colorScheme) var colorScheme
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    private var isDark: Bool { colorScheme == .dark }
    
    var body: some View {
        ZStack {
            // Background
            (isDark ? Color.black : Color(uiColor: .systemGroupedBackground))
                .ignoresSafeArea()
            
            VStack(spacing: 32) {
                Spacer()
                
                // Logo / Brand
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(.ultraThinMaterial)
                            .frame(width: 80, height: 80)
                        
                        Image(systemName: "scissors")
                            .font(.system(size: 32, weight: .light))
                            .foregroundStyle(.primary)
                    }
                    
                    Text("Cutzio")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                    
                    Text("Your salon, simplified")
                        .font(.system(size: 15))
                        .foregroundStyle(.secondary)
                }
                
                // Login Form
                VStack(spacing: 14) {
                    // Email
                    HStack(spacing: 12) {
                        Image(systemName: "envelope.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                            .frame(width: 20)
                        
                        TextField("Email", text: $email)
                            .font(.system(size: 15))
                            .textContentType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.emailAddress)
                    }
                    .padding(14)
                    .liquidGlassCard(cornerRadius: 16)
                    
                    // Password
                    HStack(spacing: 12) {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                            .frame(width: 20)
                        
                        SecureField("Password", text: $password)
                            .font(.system(size: 15))
                            .textContentType(.password)
                    }
                    .padding(14)
                    .liquidGlassCard(cornerRadius: 16)
                    
                    // Error
                    if let errorMessage {
                        Text(errorMessage)
                            .font(.system(size: 13))
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    
                    // Sign In Button
                    Button {
                        Task { await signIn() }
                    } label: {
                        HStack(spacing: 8) {
                            if isLoading {
                                ProgressView()
                                    .tint(isDark ? .black : .white)
                                    .scaleEffect(0.8)
                            }
                            Text("Sign In")
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .foregroundStyle(isDark ? .black : .white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(isDark ? .white : Color.primary)
                        }
                    }
                    .disabled(isLoading || email.isEmpty || password.isEmpty)
                    .opacity(email.isEmpty || password.isEmpty ? 0.5 : 1.0)
                    .buttonStyle(ScaleButtonStyle())
                    .padding(.top, 4)
                }
                .padding(.horizontal, 24)
                
                Spacer()
                
                // Footer
                Text("Powered by Supabase")
                    .font(.system(size: 12))
                    .foregroundStyle(.tertiary)
                    .padding(.bottom, 16)
            }
        }
    }
    
    private func signIn() async {
        isLoading = true
        errorMessage = nil
        
        do {
            try await authManager.signIn(email: email, password: password)
        } catch {
            errorMessage = "Invalid email or password"
        }
        
        isLoading = false
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthManager())
        .environmentObject(ThemeManager())
}
