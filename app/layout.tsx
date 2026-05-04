import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FontSizeControl from "@/components/FontSizeControl";
import VoiceReader from "@/components/VoiceReader";
import HighContrastToggle from "@/components/HighContrastToggle"; // ✅ Importul nou

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SyncTrip Hub | Premium Travel Planner",
  description: "Platformă revoluționară pentru managementul vacanțelor de grup.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}
      >
        {children}

        {/* TOOLKIT ACCESSIBILITATE */}
        <div className="accessibility-layer">
          <FontSizeControl />    {/* Zoom (Dreapta jos) */}
          <HighContrastToggle /> {/* Contrast (Deasupra Zoom-ului) */}
          <VoiceReader />        {/* Voce (Stânga jos) */}
        </div>
      </body>
    </html>
  );
}