import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ApiStatusProvider } from "@/context/ApiStatusContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nautilus Email Builder",
  description: "Nautilus Email Builder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ApiStatusProvider>{children}</ApiStatusProvider>
      </body>
    </html>
  );
}
