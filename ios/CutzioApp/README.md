# Cutzio iOS App

A native SwiftUI iOS app for the Cutzio salon management platform, featuring Apple's liquid glass design language.

## Requirements

- **Xcode 15+** (Swift 5.9)
- **iOS 17+** deployment target
- **Supabase Swift SDK** (via Swift Package Manager)

## Setup

1. **Open in Xcode**: Open `Package.swift` in Xcode or create a new Xcode project and add the `Sources/` files.

2. **Configure Supabase**: Edit `Sources/Services/SupabaseManager.swift` and replace the placeholder values:
   ```swift
   static let url = "https://YOUR_PROJECT_REF.supabase.co"
   static let anonKey = "YOUR_ANON_KEY"
   ```

3. **Build & Run**: Select an iOS 17+ simulator or device and run.

## Architecture

```
Sources/
├── App/
│   ├── CutzioApp.swift          # App entry point
│   └── ContentView.swift        # Root view with liquid glass tab bar
├── Models/
│   └── Models.swift             # Data models (Appointment, Service, Customer, etc.)
├── Services/
│   ├── AuthManager.swift        # Authentication state management
│   └── SupabaseManager.swift    # Supabase API client
├── Theme/
│   └── ThemeManager.swift       # Dark/light mode + color utilities
└── Views/
    ├── Agenda/
    │   └── AgendaView.swift     # Main agenda with liquid glass appointment cards
    ├── Booking/
    │   └── BookingView.swift    # Multi-step booking flow
    ├── Dashboard/
    │   └── DashboardView.swift  # Overview dashboard with glass stat cards
    ├── Services/
    │   └── ServicesView.swift   # Service management
    ├── Settings/
    │   └── SettingsView.swift   # App settings with theme switcher
    └── Components/
        ├── LoginView.swift              # Login screen
        └── LiquidGlassModifier.swift    # Reusable glass effect ViewModifier
```

## Design

- **Liquid Glass**: All cards use `liquidGlassCard()` modifier with frosted glass effect, color tint, inner glow, and subtle borders
- **Tab Bar**: Custom liquid glass dock using `.ultraThinMaterial` with spring animations
- **Dark Mode**: Full dark mode support — white theme by default, dark mode follows system or manual toggle
- **Agenda**: Day-based timeline view with week selector, completion ring, and spanning appointment blocks

## Features

- Agenda view with liquid glass appointment cards
- Multi-service booking flow
- Dashboard with stats
- Service management
- Settings with theme, working hours, notifications
- Supabase authentication
- Dark/light mode support
