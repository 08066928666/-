import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createToken, setSessionCookie, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !(await verifyPassword(data.password, user.password))) {
      return NextResponse.json({ error: "メールアドレスまたはパスワードが正しくありません" }, { status: 401 });
    }

    const token = await createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch {
    return NextResponse.json({ error: "ログインに失敗しました" }, { status: 500 });
  }
}
