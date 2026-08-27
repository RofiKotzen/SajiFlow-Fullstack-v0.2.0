import type { Metadata } from "next";
import "./globals.css";
import "./integration.css";
import "./typography.css";

export const metadata: Metadata = {
  title: "Kotzen Operation",
  description: "Sistem operasional terpadu untuk POS, dapur, inventori, purchasing, supplier, dan pengendalian anggaran.",
  openGraph: { title: "Kotzen Operation", description: "POS • KDS • Inventory • Purchasing", type: "website", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Kotzen Operation", description: "POS • KDS • Inventory • Purchasing", images: ["/og.png"] },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
