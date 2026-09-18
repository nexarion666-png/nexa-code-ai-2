import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json() as { code?: string; redirectUri?: string };
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const configuredRedirect = process.env.GITHUB_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "GitHub OAuth server configuration is missing." }, { status: 500 });
    }
    if (!code) return NextResponse.json({ error: "Missing OAuth code." }, { status: 400 });
    if (configuredRedirect && redirectUri !== configuredRedirect) {
      return NextResponse.json({ error: "Invalid OAuth redirect URI." }, { status: 400 });
    }

    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri || configuredRedirect,
      }),
      cache: "no-store",
    });
    const data = await response.json() as { access_token?: string; error?: string; error_description?: string };
    if (!response.ok || !data.access_token) {
      return NextResponse.json({ error: data.error_description || data.error || "GitHub OAuth exchange failed." }, { status: 400 });
    }
    return NextResponse.json({ access_token: data.access_token });
  } catch {
    return NextResponse.json({ error: "GitHub OAuth exchange failed." }, { status: 500 });
  }
}
