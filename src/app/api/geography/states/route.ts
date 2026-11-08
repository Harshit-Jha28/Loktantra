import { NextResponse } from "next/server";
import { states } from "vardhan-maps/data";

export async function GET() {
  return NextResponse.json(states, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Map-Source": "local-bundled",
    },
  });
}
