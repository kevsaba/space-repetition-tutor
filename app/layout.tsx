import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/AuthContext";

export const metadata: Metadata = {
  title: "Space Repetition Tutor",
  description: "AI-driven study companion for technical interview preparation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
