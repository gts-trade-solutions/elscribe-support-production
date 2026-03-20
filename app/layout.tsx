import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProvider } from "@/components/app-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "eLscribe | Ticket-first IT support",
    template: "%s | eLscribe",
  },
  description:
    "eLscribe is a ticket-first IT support workspace for chat, live escalation, company access control, and incident-based support operations.",
  applicationName: "eLscribe",
  keywords: [
    "eLscribe",
    "IT support",
    "ticketing",
    "live support",
    "voice support",
    "video support",
    "incident support",
    "company seats",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
