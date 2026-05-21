import "./globals.css";
import { Toaster } from "react-hot-toast";
import AuthProvider from "@/components/AuthProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata = {
  metadataBase: new URL("https://betgenius.ai"),
  title: {
    default: "BetGenius AI — Expert Football Predictions",
    template: "%s · BetGenius AI",
  },
  description:
    "AI-powered football predictions for EPL, La Liga, Serie A & Bundesliga. Gold, Platinum & Diamond packages with verified high-odds picks, real win-rate tracking, and an AI assistant.",
  applicationName: "BetGenius AI",
  keywords: [
    "football predictions",
    "AI predictions",
    "betting tips",
    "EPL predictions",
    "La Liga tips",
    "Serie A predictions",
    "Bundesliga tips",
    "sports betting",
    "high odds",
    "accumulator tips",
  ],
  authors: [{ name: "BetGenius AI" }],
  creator: "BetGenius AI",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/pego-logo.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/pego-logo.png", sizes: "180x180" }],
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: "BetGenius AI — Expert Football Predictions",
    description:
      "AI-powered football predictions for EPL, La Liga, Serie A & Bundesliga. Verified results, expert analysis, real-time win tracking.",
    type: "website",
    siteName: "BetGenius AI",
    url: "https://betgenius.ai",
    locale: "en_US",
    images: [{ url: "/pego-logo.png", width: 512, height: 512, alt: "BetGenius AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BetGenius AI — Expert Football Predictions",
    description:
      "AI-powered football predictions for EPL, La Liga, Serie A & Bundesliga. Real win-rate tracking and an AI assistant.",
    images: ["/pego-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    title: "BetGenius",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B0D10" },
    { media: "(prefers-color-scheme: light)", color: "#0B9635" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "BetGenius AI",
  url: "https://betgenius.ai",
  logo: "https://betgenius.ai/pego-logo.png",
  description:
    "AI-powered football prediction platform with Gold, Platinum and Diamond subscription tiers.",
  sameAs: [
    "https://x.com/betgeniusai",
    "https://instagram.com/betgeniusai",
  ],
  contactPoint: [
    { "@type": "ContactPoint", contactType: "customer support", email: "support@betgenius.ai", availableLanguage: ["en"] },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Bebas+Neue&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
      </head>
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#12141A",
                color: "#EEEFF1",
                border: "1px solid #1E2028",
                fontFamily: "'DM Sans', sans-serif",
              },
              success: { iconTheme: { primary: "#0B9635", secondary: "#fff" } },
              error: { iconTheme: { primary: "#E31725", secondary: "#fff" } },
            }}
          />
        </AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
