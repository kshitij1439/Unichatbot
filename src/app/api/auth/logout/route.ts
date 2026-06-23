import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const res = NextResponse.json({ success: true, message: "Logged out successfully" });
    
    // Clear cookie by setting expiration to epoch
    res.cookies.set("auth_token", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });

    return res;
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to log out" },
      { status: 500 }
    );
  }
}
