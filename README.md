This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Running Stripe Webhooks Locally

To test Stripe webhooks locally, you'll need to use the Stripe CLI to forward webhook events to your local development server.

### Prerequisites

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli):

   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Or download from https://github.com/stripe/stripe-cli/releases
   ```

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

### Running Webhooks Locally

1. Start your Next.js development server (in one terminal):

   ```bash
   npm run dev
   ```

2. In a separate terminal, run the Stripe CLI to forward webhooks:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhooks
   ```

3. The Stripe CLI will output a webhook signing secret (starts with `whsec_`). Copy this value.

4. Add the webhook signing secret to your `.env.local` file:

   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

5. Restart your Next.js development server to load the new environment variable.

Now any webhook events triggered in your Stripe dashboard (or via the Stripe CLI) will be forwarded to your local webhook endpoint at `http://localhost:3000/api/stripe/webhooks`.

### Testing Webhooks

You can trigger test webhook events using the Stripe CLI:

```bash
# Trigger a test subscription created event
stripe trigger customer.subscription.created

# Trigger a test payment succeeded event
stripe trigger invoice.payment_succeeded
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# typescript-next

# protagonist-desktop
