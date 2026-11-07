import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DEFENx | On-Device Behavioral EDR Command Center",
  description: "Next-generation privacy-first autonomous behavioral anomaly detection orchestrator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#07090e] text-slate-100 antialiased selection:bg-[#00f5d4]/30 selection:text-[#00f5d4]">
        {children}
      </body>
    </html>
  );
}

