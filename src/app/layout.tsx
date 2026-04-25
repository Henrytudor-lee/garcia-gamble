import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import { GameProvider } from "@/lib/GameContext";

const manrope = Manrope({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: ["200", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "High-Stakes Digital | Texas Hold'em",
  description: "Own the Table. The world's most exclusive digital poker arena.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${manrope.variable} ${inter.variable} bg-background text-on-surface font-body antialiased min-h-screen`}>
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
