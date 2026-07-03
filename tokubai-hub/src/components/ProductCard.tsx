"use client";

import { useState } from "react";
import { CATEGORY_LABELS, CHAIN_COLORS, formatExpiry, formatPrice } from "@/lib/constants";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    category: string;
    originalPrice: number;
    discountPrice: number;
    discountPercent: number;
    expiryAt: string;
    quantity: number;
    imageEmoji: string;
    store: { id: string; name: string; chain: string; address: string };
  };
  onAdd?: () => void;
  showAddButton?: boolean;
}

export default function ProductCard({ product, onAdd, showAddButton = true }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const chainColor = CHAIN_COLORS[product.store.chain] ?? "bg-stone-500";
  const savings = product.originalPrice - product.discountPrice;
  const expiry = formatExpiry(product.expiryAt);
  const urgent = expiry.includes("分") || expiry.includes("1時間");

  function handleAdd() {
    onAdd?.();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <article className="group card-surface flex flex-col overflow-hidden transition hover:shadow-card-hover">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-brand-50 via-amber-50 to-orange-50">
        <span className="text-5xl transition-transform group-hover:scale-110 sm:text-6xl" role="img" aria-hidden>
          {product.imageEmoji}
        </span>
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          <span className="rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
            -{product.discountPercent}%
          </span>
          {urgent && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
              急ぎ
            </span>
          )}
        </div>
        <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-stone-600 shadow-sm backdrop-blur">
          残り {product.quantity}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white ${chainColor}`}>
            {product.store.chain}
          </span>
          <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
            {CATEGORY_LABELS[product.category]}
          </span>
        </div>

        <h3 className="mb-1 line-clamp-2 text-sm font-bold leading-snug text-stone-900 sm:text-base">
          {product.name}
        </h3>
        <p className="mb-3 line-clamp-1 text-xs text-stone-500">{product.store.name}</p>

        <div className="mb-1 flex items-end gap-2">
          <span className="text-xl font-extrabold tracking-tight text-red-600 sm:text-2xl">
            {formatPrice(product.discountPrice)}
          </span>
          <span className="pb-0.5 text-xs text-stone-400 line-through">
            {formatPrice(product.originalPrice)}
          </span>
        </div>
        <p className="mb-3 text-xs font-medium text-emerald-600">
          {formatPrice(savings)} お得
        </p>

        <div
          className={`mb-3 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            urgent ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"
          }`}
        >
          <span aria-hidden>⏱</span>
          {expiry}
        </div>

        {showAddButton && onAdd && (
          <button
            onClick={handleAdd}
            className={`touch-target mt-auto w-full rounded-2xl py-3 text-sm font-bold transition active:scale-[0.98] ${
              added
                ? "bg-emerald-500 text-white"
                : "bg-brand-500 text-white hover:bg-brand-600"
            }`}
          >
            {added ? "✓ 追加しました" : "カートに追加"}
          </button>
        )}
      </div>
    </article>
  );
}
