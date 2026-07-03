"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ORDER_STATUS_LABELS, formatPrice } from "@/lib/constants";

interface Order {
  id: string;
  pickupCode: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  store: { name: string; address: string; openHours: string };
  items: { quantity: number; unitPrice: number; product: { name: string; imageEmoji: string } }[];
}

export default function OrderDetailContent({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((orders: Order[]) => {
        const found = orders.find((o) => o.id === id);
        setOrder(found ?? null);
      });
  }, [id]);

  if (!order) return <div className="py-20 text-center text-gray-500">読み込み中...</div>;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {isNew && (
        <div className="mb-6 rounded-2xl bg-green-50 p-6 text-center">
          <div className="mb-2 text-4xl">✅</div>
          <h2 className="text-xl font-bold text-green-800">予約が完了しました！</h2>
          <p className="text-sm text-green-700">店頭で受取コードをご提示ください</p>
        </div>
      )}

      <div className="mb-6 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 p-8 text-center">
        <p className="mb-1 text-sm text-gray-600">受取コード</p>
        <p className="font-mono text-4xl font-bold tracking-widest text-orange-600">{order.pickupCode}</p>
        <p className="mt-2 text-xs text-gray-500">このコードを店員に見せてください</p>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-bold text-orange-700">
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          <span className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleString("ja-JP")}
          </span>
        </div>

        <h2 className="mb-1 font-bold">{order.store.name}</h2>
        <p className="mb-1 text-sm text-gray-600">📍 {order.store.address}</p>
        <p className="mb-4 text-sm text-gray-500">🕐 {order.store.openHours}</p>

        <div className="space-y-2 border-t pt-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span>
                {item.product.imageEmoji} {item.product.name} × {item.quantity}
              </span>
              <span>{formatPrice(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between border-t pt-4 font-bold">
          <span>合計（店頭支払い）</span>
          <span className="text-red-600">{formatPrice(order.totalAmount)}</span>
        </div>
      </div>

      <Link href="/products" className="block text-center text-orange-600 hover:underline">
        続けて買い物する →
      </Link>
    </div>
  );
}
