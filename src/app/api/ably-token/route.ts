import * as Ably from "ably";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = process.env.ABLY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ABLY_API_KEY" },
      { status: 500 },
    );
  }

  const clientId =
    req.nextUrl.searchParams.get("clientId") ||
    `guest-${Math.random().toString(36).slice(2)}`;

  const client = new Ably.Rest(apiKey);

  const tokenRequest = await client.auth.createTokenRequest({
    clientId,
    capability: {
      "pacman:*": ["publish", "subscribe", "presence"],
    },
  });

  return NextResponse.json(tokenRequest);
}
