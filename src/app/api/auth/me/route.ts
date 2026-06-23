import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch user session" },
      { status: 500 }
    );
  }
}
