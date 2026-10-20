import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Trip fund — Paiflow SDK testnet demo",
  description: "Paiflow SDK testnet trip fund contribution example",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
