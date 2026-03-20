import "./globals.css";
import { Toaster } from "react-hot-toast";
import AuthProvider from "@/components/AuthProvider";

export const metadata = {
  metadataBase: new URL("https://betgenius.ai"),
  title: "BetGenius AI — Expert Football Predictions",
  description:
    "Expert football predictions for EPL, La Liga, Serie A & Bundesliga. Gold, Platinum & Diamond packages with verified high-odds picks delivered in rounds.",
  keywords: "football predictions, betting tips, EPL predictions, La Liga tips, Serie A predictions, Bundesliga tips, sports betting, high odds",
  icons: {
    icon: "/pego-logo.png",
    apple: "/pego-logo.png",
  },
  openGraph: {
    title: "BetGenius AI — Expert Football Predictions",
    description: "Get winning predictions for EPL, La Liga, Serie A & Bundesliga. Verified results, expert analysis.",
    type: "website",
    siteName: "BetGenius AI",
    url: "https://betgenius.ai",
    images: [{ url: "/pego-logo.png", width: 512, height: 512, alt: "BetGenius AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BetGenius AI — Expert Football Predictions",
    description: "Get winning predictions for EPL, La Liga, Serie A & Bundesliga. Verified results, expert analysis.",
    images: ["/pego-logo.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Bebas+Neue&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
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
              success: {
                iconTheme: { primary: "#0B9635", secondary: "#fff" },
              },
              error: {
                iconTheme: { primary: "#E31725", secondary: "#fff" },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
