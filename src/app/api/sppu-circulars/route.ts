import { NextResponse } from "next/server";
import { fetchCircularsFromSppu } from "@/lib/sppu";

export async function GET() {
  try {
    const circulars = await fetchCircularsFromSppu();
    return NextResponse.json({ circulars });
  } catch (error) {
    console.error("Error in circulars API route:", error);
    return NextResponse.json({ circulars: [] });
  }
}
