import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { SafeArea } from "@coinbase/onchainkit/minikit";
import { minikitConfig } from "../minikit.config";
import { RootProvider } from "./rootProvider";
import { BottomNav } from "./components/BottomNav";
import { AnimatedBackground } from "./components/AnimatedBackground";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://tech-mini-kappa.vercel.app";
  
  return {
    title: "Base Pulse daily onchain",
    description: "Daily onchain actions with badges",
    icons: {
      icon: "/blue-icon.png",
    },
    other: {
      "fc:frame": JSON.stringify({
        version: minikitConfig.miniapp.version,
        imageUrl: minikitConfig.miniapp.heroImageUrl,
        button: {
          title: `Launch ${minikitConfig.miniapp.name}`,
          action: {
            name: `Launch ${minikitConfig.miniapp.name}`,
            type: "launch_frame",
          },
        },
      }),
      "base:app_id": "694fc1a34d3a403912ed822d",
    },
    metadataBase: new URL(baseUrl),
    openGraph: {
      title: "Base Pulse daily onchain",
      description: "Daily onchain actions with badges",
      url: "https://tech-mini-kappa.vercel.app",
      siteName: "Base Pulse",
      images: [
        {
          url: `${baseUrl}/blue-hero.png`,
          width: 1200,
          height: 630,
          alt: "Base Pulse OG Image",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      images: [`${baseUrl}/blue-hero.png`],
    },
  };
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/butterfly-overlay.css" />
        <script src="/butterfly-overlay.js" defer />
      </head>
      <body className={`${inter.variable} ${sourceCodePro.variable}`}>
        <RootProvider>
          <AnimatedBackground />
          <SafeArea>
            {children}
            <BottomNav />
          </SafeArea>
        </RootProvider>
      </body>
    </html>
  );
}
