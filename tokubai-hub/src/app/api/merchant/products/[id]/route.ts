import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

const updateSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  discountPercent: z.number().int().min(1).max(90).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (session.role !== "MERCHANT" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { store: true },
    });
    if (!product) {
      return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
    }
    if (session.role !== "ADMIN" && product.store.merchantId !== session.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.discountPercent !== undefined) {
      updateData.discountPercent = data.discountPercent;
      updateData.discountPrice = Math.round(product.originalPrice * (1 - data.discountPercent / 100));
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    if (session.role !== "MERCHANT" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { store: true },
    });
    if (!product) {
      return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
    }
    if (session.role !== "ADMIN" && product.store.merchantId !== session.id) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false, quantity: 0 },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
