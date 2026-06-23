import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, createToken } from "@/lib/auth";

const MODERATOR_SIGNUP_CODE = process.env.MODERATOR_SIGNUP_CODE || "sppuadmin123";

export async function POST(req: NextRequest) {
  try {
    const { email, password, code } = await req.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 400 });
    }

    // Determine role based on signup code
    let role = "STUDENT";
    if (code && code.trim() === MODERATOR_SIGNUP_CODE) {
      role = "MODERATOR";
    }

    const { hash, salt } = hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hash,
        salt,
        role,
      },
    });

    const token = createToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    // Create the response with HttpOnly cookie
    const res = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
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
    console.error("Register error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register new user" },
      { status: 500 }
    );
  }
}
