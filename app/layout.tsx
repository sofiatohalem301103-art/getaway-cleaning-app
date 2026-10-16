export const dynamic = 'force-dynamic';
export const revalidate = 0;

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Header from "./Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Getaway Cleaning | Professional Cleaning Services in Cyprus",
  description: "Book professional home, office, turnover, and holiday apartment cleaning services with Getaway Cleaning. Fast, reliable, and easy online booking.",
  keywords: ["cleaning service", "Paphos cleaning", "holiday home cleaning", "Getaway Cleaning", "turnover cleaning"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-screen w-full flex flex-col bg-[#F8FAFC] text-slate-900 m-0 p-0 antialiased">
        <Suspense fallback={<div className="h-16 bg-[#F8FAFC]" />}>
          <Header />
        </Suspense>
        
        <main className="flex-1 w-full flex flex-col bg-[#F8FAFC]">
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </main>
      </body>
    </html>
  );
}