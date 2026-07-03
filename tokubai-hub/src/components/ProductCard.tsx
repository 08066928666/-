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
  const chainColor = CHAIN_COLORS[product.store.chain] ?? "bg-gray-500";

  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative bg-gradient-to-br from-orange-50 to-amber-50 p-6 text-center">
        <span className="text-5xl">{product.imageEmoji}</span>
        <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
          {product.discountPercent}% OFF
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-orange-700">
          残り{product.quantity}
        </span>
      </div>

      <div className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${chainColor}`}>
            {product.store.chain}
          </span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
            {CATEGORY_LABELS[product.category]}
          </span>
        </div>

        <h3 className="mb-1 font-bold text-gray-900 line-clamp-2">{product.name}</h3>
        <p className="mb-3 text-xs text-gray-500 line-clamp-1">{product.store.name}</p>

        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-xl font-bold text-red-600">{formatPrice(product.discountPrice)}</span>
          <span className="text-sm text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>
        </div>

        <div className="mb-3 flex items-center gap-1 text-xs text-amber-700">
          <span>⏰</span>
          <span className="font-medium">{formatExpiry(product.expiryAt)}</span>
        </div>

        {showAddButton && onAdd && (
          <button
            onClick={onAdd}
            className="touch-target w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600 active:scale-[0.98] md:py-2.5"
          >
            カートに追加
          </button>
        )}
      </div>
    </div>
  );
}
