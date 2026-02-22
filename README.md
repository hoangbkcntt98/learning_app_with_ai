This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Amazon Bedrock Integration

The app includes a server route that calls Bedrock:

- `POST /api/ai/chat`
- Body: `{ "prompt": "..." }`
- Also supports `multipart/form-data` with:
  - `prompt` (optional if `image` provided)
  - `image` (`jpg`, `png`, `gif`, `webp`, max 5MB)
- Response: `{ "text": "..." }`

It uses AWS credentials from environment variables. Copy `.env.example` to `.env` and set:

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` (only needed for temporary credentials)
- `AUTH_SECRET`

Optional:

- `BEDROCK_MODEL_ID` (default: `amazon.nova-lite-v1:0`)
- `BEDROCK_REGION` (fallback to `AWS_REGION`)
- `BEDROCK_MAX_TOKENS`
- `BEDROCK_TEMPERATURE`
- `BEDROCK_SYSTEM_PROMPT`
- `DEFAULT_AI_DAILY_QUOTA_PER_USER`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `GOOGLE_REDIRECT_URI` (recommended, exact callback URL)

## Google Login Setup

The app supports login via Google OAuth 2.0.

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create/select a project.
3. Configure OAuth consent screen.
4. Create OAuth Client ID (Web application).
5. Add Authorized redirect URIs:
   - Local: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://<your-domain>/api/auth/google/callback`
6. Put credentials into env:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000` or your production URL)
   - `GOOGLE_REDIRECT_URI` (must exactly match a Google authorized redirect URI)

When user clicks **Continue with Google**, app redirects to:

- `/api/auth/google/start` -> Google OAuth screen
- `/api/auth/google/callback` -> app creates/signs in user and sets session cookie

`GOOGLE_REDIRECT_URI` example:

- Local: `http://localhost:3000/api/auth/google/callback`
- Vercel production: `https://your-domain.com/api/auth/google/callback`

Example request:

```bash
curl -X POST http://localhost:3000/api/ai/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Give me one JLPT N5 quiz question in Japanese with 4 choices.\"}"
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database (Prisma)

This project now uses Prisma with PostgreSQL.

1. Set `DATABASE_URL` in `.env`
2. Generate Prisma client:
   - `npm run prisma:generate`
3. Push schema to database:
   - `npm run db:push`
4. Seed data:
   - `npm run seed:users`
   - `npm run seed:questions`

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy to Vercel

Use these steps to deploy this app to production on Vercel.

1. Push your code to GitHub/GitLab/Bitbucket.
2. In Vercel, click **Add New > Project** and import your repository.
3. If this repository contains multiple folders, set **Root Directory** to `japanesegame`.
4. In **Environment Variables**, add all required values:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AWS_REGION`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_SESSION_TOKEN` (only if you use temporary AWS credentials)
   - `BEDROCK_REGION` (optional)
   - `BEDROCK_MODEL_ID` (optional)
   - `BEDROCK_MAX_TOKENS` (optional)
   - `BEDROCK_TEMPERATURE` (optional)
   - `BEDROCK_SYSTEM_PROMPT` (optional)
   - `NEXT_PUBLIC_DEFAULT_LANGUAGE` (optional)
   - `DEFAULT_AI_DAILY_QUOTA_PER_USER` (optional, default per-user AI daily quota)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL` (for OAuth callback URL generation)
5. Click **Deploy**.

### Prisma Production Setup

After setting production `DATABASE_URL`, sync schema to your production DB:

```bash
npm run db:push
```

Then seed initial users/questions if needed:

```bash
npm run seed:users
npm run seed:questions
```

Run these commands with production environment variables (for example in your CI/CD job or local terminal pointing to production DB).

### Notes

- Do not commit real secrets in `.env`.
- If Vercel build fails due to Prisma client generation on Windows locally, deploy can still succeed on Vercel Linux builders.
- For custom domains, configure in **Vercel Project > Settings > Domains**.
