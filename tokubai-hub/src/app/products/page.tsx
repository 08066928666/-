import { Suspense } from "react";
import ProductsContent from "./ProductsContent";

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">読み込み中...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
