# Nexa Code AI (NCA)

Nexa Code AI is a Next.js 14 App Router application for planning, generating, viewing, downloading, pushing, and deploying code with user-provided AI/GitHub/Vercel credentials.

## Stack
- Next.js 14 + React 18 + TypeScript
- Tailwind CSS
- Zustand
- Vercel AI SDK
- Monaco Editor
- Octokit
- JSZip

## Local development
```bash
npm install
npm run build
npm run dev
```

Open `http://localhost:3000`.

## Vercel deployment
1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Vercel detects Next.js automatically; the included `vercel.json` uses `npm run build`.
4. Add the GitHub OAuth environment variables from `.env.example` if GitHub connection is enabled.
5. Deploy.

AI, GitHub, and Vercel access tokens are BYOK credentials entered by the user. The Vercel token is stored in browser localStorage under `vercel_token`; there is intentionally no server `VERCEL_TOKEN`.

## GitHub OAuth
Create a GitHub OAuth App and set its callback URL to the value of `GITHUB_REDIRECT_URI` / `NEXT_PUBLIC_GITHUB_REDIRECT_URI`. The application requests `repo user` scope.

## Image inspiration
PNG/JPG inspiration images are resized in the browser to a maximum dimension of 1024px and converted to JPEG. They are sent to the AI request as multimodal image input and are also kept in the per-chat virtual file store. Images over 2 MB are excluded from downloaded ZIP archives.

## Scope
This is the complete Phase 5 polish release. GitHub and Vercel integrations from earlier phases remain included.


## Phase 6 — Authentication & Cross-Device Sync

Nexa Code AI uses Supabase Auth for email/password and Google sign-in.

### Supabase setup

1. Create a Supabase project.
2. In Authentication → Providers, enable Email and Google as desired.
3. Add these Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. In Supabase SQL Editor, run `supabase/schema.sql`.
5. Add your deployed callback URL to the Supabase/Gmail OAuth provider settings:
   `https://YOUR-DOMAIN/auth/callback`

The browser stores the user's BYOK/API and integration tokens locally for immediate app use, while Phase 6 also synchronizes the account's data to the authenticated user's `user_data` row. Use appropriate Supabase security policies and treat tokens as sensitive.

### Auth behavior

- `/login` and `/signup` provide email/password and Google OAuth.
- `/chat` and `/settings` require an authenticated Supabase session.
- The landing page remains public and tells guests to log in to save projects.
- User data is loaded after sign-in and saved with a short debounce as local app data changes.
- GitHub and Vercel integrations remain user-scoped because their tokens are synchronized under the authenticated user.
