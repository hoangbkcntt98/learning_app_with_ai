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

Optional:

- `BEDROCK_MODEL_ID` (default: `amazon.nova-lite-v1:0`)
- `BEDROCK_REGION` (fallback to `AWS_REGION`)
- `BEDROCK_MAX_TOKENS`
- `BEDROCK_TEMPERATURE`
- `BEDROCK_SYSTEM_PROMPT`

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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
