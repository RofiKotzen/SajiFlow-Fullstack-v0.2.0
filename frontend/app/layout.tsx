import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./integration.css";
import "./typography.css";
import "./shell.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Kotzen Operation",
  description: "Sistem operasional terpadu untuk POS, dapur, inventori, purchasing, supplier, dan pengendalian anggaran.",
  openGraph: { title: "Kotzen Operation", description: "POS • KDS • Inventory • Purchasing", type: "website", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Kotzen Operation", description: "POS • KDS • Inventory • Purchasing", images: ["/og.png"] },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" className={inter.variable}><body className={jetBrainsMono.variable}>{children}</body></html>;
}
