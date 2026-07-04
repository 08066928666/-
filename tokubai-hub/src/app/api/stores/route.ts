import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const stores = await prisma.store.findMany({
    include: {
      _count: {
        select: {
          products: {
            where: {
              isActive: true,
              quantity: { gt: 0 },
              expiryAt: { gt: new Date() },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(stores);
}
