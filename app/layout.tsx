import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "./theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BuBu Learning",
  description: "BuBu Learning - Japanese learning game, forum, and AI chat.",
  // Use the shared logo file for browser tab/icon surfaces.
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // Set initial theme class before hydration to avoid flash.
          dangerouslySetInnerHTML={{
            __html: `(() => {
              const key = "theme_mode";
              const stored = localStorage.getItem(key);
              const mode = stored === "dark" ? "dark" : "light";
              const isDark = mode === "dark";
              document.documentElement.classList.toggle("dark", isDark);
              document.documentElement.dataset.themeMode = mode;
            })();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
