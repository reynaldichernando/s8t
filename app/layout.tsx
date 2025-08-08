import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "s8t",
  description: "screenshot static website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
