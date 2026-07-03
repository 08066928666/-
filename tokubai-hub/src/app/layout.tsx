import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import InstallPrompt from "@/components/InstallPrompt";
import { CartProvider } from "@/components/CartProvider";
import CartButton from "@/components/CartButton";

export const metadata: Metadata = {
  title: "Tokubai Hub - リアルタイム値下げ商品プラットフォーム",
  description: "スーパー・コンビニの値下げ商品をリアルタイムで確認。オンライン予約、店頭受取で食品ロスを削減。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tokubai Hub",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f97316",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen antialiased">
        <CartProvider>
          <Navbar />
          <main className="page-content">{children}</main>
          <CartButton />
          <MobileBottomNav />
          <InstallPrompt />
        </CartProvider>
      </body>
    </html>
  );
}
