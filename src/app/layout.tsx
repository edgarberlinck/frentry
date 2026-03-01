import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frentry - Error Tracking",
  description: "Simple, self-hosted error tracking for your applications",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
