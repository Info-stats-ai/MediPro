import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MediNotes Pro",
  description: "Clinical notes transformed into clear, patient-friendly guidance.",
  icons: { icon: "/mark.svg" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <Providers><AppShell>{children}</AppShell></Providers>
      </body>
    </html>
  );
}
