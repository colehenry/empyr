import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Empyr",
  description: "Historical border-state map prototype"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
