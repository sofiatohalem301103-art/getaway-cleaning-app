import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Getaway Cleaning",
  description: "Professional cleaning services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {/* 🟢 ใช้ min-h-screen และ bg-[#F8FAFC] เพื่อรองรับการสกอร์ลทุกหน้าและไม่มีสีขาวโผล่ล่างสุด */}
      <body className="min-h-screen w-full flex flex-col bg-[#F8FAFC] text-slate-900 m-0 p-0 antialiased">
        <Header />
        <main className="flex-1 w-full flex flex-col bg-[#F8FAFC]">
          {children}
        </main>
      </body>
    </html>
  );
}