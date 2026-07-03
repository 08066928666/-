"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ORDER_STATUS_LABELS, formatPrice } from "@/lib/constants";

interface Order {
  id: string;
  pickupCode: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  store: { name: string; address: string };
  items: { quantity: number; unitPrice: number; product: { name: string; imageEmoji: string } }[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login?redirect=/orders");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setOrders(data);
        setLoading(false);
      });
  }, [router]);

  if (loading) return <div className="py-20 text-center text-gray-500">読み込み中...</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">注文履歴</h1>

      {orders.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <p className="mb-4">まだ注文がありません</p>
          <Link href="/products" className="text-orange-600 hover:underline">
            値下げ商品を見る →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-bold text-orange-700">
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleString("ja-JP")}
                </span>
              </div>
              <p className="mb-1 font-medium">{order.store.name}</p>
              <div className="mb-2 flex gap-1">
                {order.items.map((item, i) => (
                  <span key={i} className="text-lg">{item.product.imageEmoji}</span>
                ))}
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-sm text-gray-500">受取コード: {order.pickupCode}</span>
                <span className="font-bold text-red-600">{formatPrice(order.totalAmount)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
