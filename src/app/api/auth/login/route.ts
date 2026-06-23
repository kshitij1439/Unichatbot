import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = verifyPassword(password, user.password, user.salt);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return res;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log in" },
      { status: 500 }
    );
  }
}
