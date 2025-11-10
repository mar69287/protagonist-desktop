import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Protagonist - Get Paid to Accomplish Your Goals",
  description:
    "Transform your aspirations into achievements with accountability that matters. Set goals, commit to them, and earn rewards as you succeed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased bg-black">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-black`}
      >
        <AuthProvider>
          <Navbar />
          <div className="flex-1 pt-20">{children}</div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
