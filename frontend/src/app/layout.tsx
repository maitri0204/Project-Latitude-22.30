import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
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
  title: "Latitude LMS",
  description: "Latitude Learning Management System",
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
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#ffffff",
              color: "#1e293b",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px rgba(45, 91, 255, 0.08)",
              fontSize: "14px",
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            },
            success: {
              iconTheme: { primary: "#2d5bff", secondary: "#ffffff" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#ffffff" },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
