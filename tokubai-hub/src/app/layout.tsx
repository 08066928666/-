import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { CartProvider } from "@/components/CartProvider";
import CartButton from "@/components/CartButton";

export const metadata: Metadata = {
  title: "Tokubai Hub - リアルタイム値下げ商品プラットフォーム",
  description: "スーパー・コンビニの値下げ商品をリアルタイムで確認。オンライン予約、店頭受取で食品ロスを削減。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">
        <CartProvider>
          <Navbar />
          <main>{children}</main>
          <CartButton />
        </CartProvider>
      </body>
    </html>
  );
}
