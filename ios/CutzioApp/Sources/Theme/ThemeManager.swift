import SwiftUI

@MainActor
class ThemeManager: ObservableObject {
    @AppStorage("colorSchemePreference") var colorSchemePreference: String = "system"
    @Published var accentColor: Color = .green
    
    var colorScheme: ColorScheme? {
        switch colorSchemePreference {
        case "light": return .light
        case "dark": return .dark
        default: return nil // system
        }
    }
    
    func toggleTheme() {
        switch colorSchemePreference {
        case "light": colorSchemePreference = "dark"
        case "dark": colorSchemePreference = "system"
        default: colorSchemePreference = "light"
        }
    }
}

// MARK: - Liquid Glass Style Constants
enum LiquidGlass {
    static let cornerRadius: CGFloat = 22
    static let blurRadius: CGFloat = 40
    static let borderOpacityLight: CGFloat = 0.06
    static let borderOpacityDark: CGFloat = 0.12
    static let fillOpacityLight: CGFloat = 0.15
    static let fillOpacityDark: CGFloat = 0.2
    static let innerGlowLight: CGFloat = 0.5
    static let innerGlowDark: CGFloat = 0.08
}

// MARK: - Color Extensions
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
    
    static func serviceColor(_ colorString: String?) -> Color {
        guard let colorString else { return .green }
        if colorString.hasPrefix("#") {
            return Color(hex: colorString)
        }
        if colorString.contains("blue") { return .blue }
        if colorString.contains("green") { return .green }
        if colorString.contains("red") || colorString.contains("rose") { return .red }
        if colorString.contains("purple") { return .purple }
        if colorString.contains("orange") || colorString.contains("amber") { return .orange }
        if colorString.contains("pink") { return .pink }
        if colorString.contains("cyan") || colorString.contains("teal") { return .teal }
        if colorString.contains("yellow") { return .yellow }
        if colorString.contains("indigo") { return .indigo }
        return .green
    }
}
