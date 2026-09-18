import type { Metadata } from "next";
import "./globals.css";
import { AuthSync } from "@/components/auth-sync";

export const metadata: Metadata = {
  title: "Nexa Code AI",
  description: "Plan • Code • Build"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthSync />{children}</body>
    </html>
  );
}
