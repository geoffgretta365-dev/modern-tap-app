import type { Metadata } from "next";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "ModernTap",
  description: "Manage your ModernTap plaques, Smart Pages, analytics, review tracking, and requests.",
  applicationName: "ModernTap",
  icons: { icon: "/modern-tap-mark.svg", apple: "/modern-tap-192.png" },
};

export const viewport = { themeColor: "#17324d" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
