import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Orbitron, Space_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { ConditionalNavigation } from "@/components/conditional-navigation";
import { ConditionalSecurityBar } from "@/components/conditional-security-bar";
import { Chatbot } from "@/components/chatbot";
import { PageTransition } from "@/components/page-transition";
import { BubbleCursor } from "@/components/bubble-cursor";
import { SubmarineHUD } from "@/components/submarine-hud";
import { MareyeVoiceAssistant } from "@/components/mareye-voice-assistant";
import { DemoDataResetManager } from "@/components/demo-data-reset-manager";
import { Toaster } from "sonner";

import "./globals.css";
import "leaflet/dist/leaflet.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "700", "900"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "MarEye - Marine Security Defense Platform",
  description:
    "Advanced AI-powered platform for deep-sea marine species identification, environmental threat assessment, water quality monitoring, and conservation insights using cutting-edge machine learning and environmental DNA analysis.",
  keywords:
    "marine biodiversity, deep sea research, species identification, AI, environmental DNA, water quality, conservation, marine biology",
  authors: [{ name: "AI-Driven Biodiversity Research Team" }],
  openGraph: {
    title: "MarEye - Marine Security Defense Platform",
    description:
      "Revolutionary AI platform for marine conservation and species discovery",
    type: "website",
  },
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`font-body ${GeistSans.variable} ${GeistMono.variable} ${orbitron.variable} ${spaceMono.variable}`}
      >
        <DemoDataResetManager />
        <ConditionalSecurityBar />
        <ConditionalNavigation />
        <BubbleCursor />
        <SubmarineHUD />
        <Suspense
          fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950" />
          }
        >
          <PageTransition>{children}</PageTransition>
        </Suspense>

        <Chatbot />
        <MareyeVoiceAssistant />
        <Toaster richColors position="top-right" theme="dark" />

        <Analytics />
      </body>
    </html>
  );
}
