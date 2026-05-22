import * as Ably from "ably";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const apiKey = process.env.ABLY_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing ABLY_API_KEY. Add it in Vercel Project Settings > Environment Variables, then redeploy.",
      },
      { status: 500 },
    );
  }

  const clientId =
    req.nextUrl.searchParams.get("clientId") ||
    `guest-${Math.random().toString(36).slice(2)}`;

  try {
    const client = new Ably.Rest(apiKey);

    const tokenRequest = await client.auth.createTokenRequest({
      clientId,
      capability: {
        "pacman:*": ["publish", "subscribe", "presence"],
      },
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("Failed to create Ably token request", error);

    return NextResponse.json(
      {
        error:
          "Unable to create Ably token request. Check that ABLY_API_KEY is valid.",
      },
      { status: 500 },
    );
  }
}
