import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import { SearchProvider } from "@/components/SearchProvider";
import { CartAuthSync } from "@/components/CartAuthSync";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MyatPwint - Myanmar Digital Publishing Platform",
  description: "Discover and publish Myanmar literature on the leading digital publishing platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <SearchProvider>
            <CartAuthSync />
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <main>{children}</main>
            </div>
          </SearchProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
