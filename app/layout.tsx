import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Logo from "./components/Logo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Tampilkan fallback font lebih dulu
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Ragasi App",
  description: "Sistem Manajemen Distribusi PT. Ragasi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased relative`}
      >
        {/* Logo di pojok kanan atas */}
        <div className="fixed top-4 right-30 z-40 pointer-events-none">
          <Logo className="h-12 w-12" />
        </div>
        {children}
      </body>
    </html>
  );
}
