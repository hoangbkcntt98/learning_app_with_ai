import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";
import { LogoutButton } from "./logout-button";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolve auth state once in layout to render a shared top navigation bar.
  const user = await getCurrentUser();

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
        {user ? (
          <header className="sticky top-0 z-40 w-full border-b border-black/10 bg-white/90 px-4 py-2 backdrop-blur dark:bg-neutral-900/90">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
              {/* Keep brand logo at the left side like a top app menu bar. */}
              <Link href="/" className="inline-flex items-center gap-2">
                <Image
                  src="/images/logo.png"
                  alt="BuBu Learning logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-lg object-cover"
                  priority
                />
                <span className="text-sm font-semibold">BuBu Learning</span>
              </Link>
              <LogoutButton />
            </div>
          </header>
        ) : null}
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
