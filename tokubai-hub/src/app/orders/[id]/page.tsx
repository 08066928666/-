import { Suspense } from "react";
import OrderDetailContent from "./OrderDetailContent";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">読み込み中...</div>}>
      <OrderDetailContent id={params.id} />
    </Suspense>
  );
}
