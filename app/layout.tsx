import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope, Space_Grotesk } from "next/font/google";
import "@/app/globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body"
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "MarginMind",
  description: "Autonomous SaaS spend optimization with NVIDIA NIM and a Locus-native action layer."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={bodyFont.variable + " " + displayFont.variable}>{children}</body>
    </html>
  );
}
