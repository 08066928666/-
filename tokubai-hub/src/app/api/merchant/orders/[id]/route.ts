import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

const statusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "READY", "PICKED_UP", "CANCELLED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (session.role !== "MERCHANT" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { store: true, items: true },
    });
    if (!order) {
      return NextResponse.json({ error: "注文が見つかりません" }, { status: 404 });
    }
    if (session.role !== "ADMIN" && order.store.merchantId !== session.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const body = await req.json();
    const { status } = statusSchema.parse(body);

    if (status === "CANCELLED" && order.status !== "CANCELLED" && order.status !== "PICKED_UP") {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          });
        }
        await tx.order.update({ where: { id: params.id }, data: { status } });
      });
    } else {
      await prisma.order.update({ where: { id: params.id }, data: { status } });
    }

    const updated = await prisma.order.findUnique({
      where: { id: params.id },
      include: { store: true, items: { include: { product: true } }, user: { select: { name: true } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
