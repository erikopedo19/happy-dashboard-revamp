import SwiftUI

// MARK: - Liquid Glass Card Modifier
struct LiquidGlassCard: ViewModifier {
    let tintColor: Color
    let cornerRadius: CGFloat
    @Environment(\.colorScheme) var colorScheme
    
    private var isDark: Bool { colorScheme == .dark }
    
    func body(content: Content) -> some View {
        content
            .background {
                ZStack {
                    // Base fill with tint
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(tintColor.opacity(isDark ? 0.2 : 0.12))
                    
                    // Glass material overlay
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(.ultraThinMaterial)
                        .opacity(isDark ? 0.3 : 0.5)
                    
                    // Top shine gradient
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    .white.opacity(isDark ? 0.06 : 0.4),
                                    .clear,
                                    .white.opacity(isDark ? 0.02 : 0.15)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    
                    // Border
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .stroke(
                            LinearGradient(
                                colors: [
                                    .white.opacity(isDark ? 0.15 : 0.5),
                                    .white.opacity(isDark ? 0.05 : 0.2)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 0.5
                        )
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .shadow(
                color: tintColor.opacity(isDark ? 0.15 : 0.08),
                radius: 12,
                y: 4
            )
    }
}

// MARK: - Liquid Glass Surface (for tab bar, headers)
struct LiquidGlassSurface: ViewModifier {
    let cornerRadius: CGFloat
    @Environment(\.colorScheme) var colorScheme
    
    private var isDark: Bool { colorScheme == .dark }
    
    func body(content: Content) -> some View {
        content
            .background {
                ZStack {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(.ultraThinMaterial)
                    
                    // Subtle shine
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [
                                    .white.opacity(isDark ? 0.04 : 0.3),
                                    .clear
                                ],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                    
                    // Border
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .stroke(
                            isDark
                                ? Color.white.opacity(0.1)
                                : Color.black.opacity(0.05),
                            lineWidth: 0.5
                        )
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .shadow(color: .black.opacity(isDark ? 0.3 : 0.08), radius: 16, y: 4)
    }
}

// MARK: - View Extensions
extension View {
    func liquidGlassCard(tintColor: Color = .green, cornerRadius: CGFloat = 22) -> some View {
        modifier(LiquidGlassCard(tintColor: tintColor, cornerRadius: cornerRadius))
    }
    
    func liquidGlassSurface(cornerRadius: CGFloat = 28) -> some View {
        modifier(LiquidGlassSurface(cornerRadius: cornerRadius))
    }
}
