# Stripe Integration Guide

This document provides instructions for setting up and using the Stripe payment processing in the application.

## Prerequisites

1. A Stripe account (https://dashboard.stripe.com/register)
2. Node.js and npm installed
3. The application set up with the required dependencies

## Setup Instructions

### 1. Configure Environment Variables

Create a `.env` file in the project root and add the following variables:

```
# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
VITE_STRIPE_SECRET_KEY=sk_test_your_secret_key_here
VITE_STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (replace with your actual price IDs from Stripe Dashboard)
VITE_STRIPE_PRICE_BASIC_MONTHLY=price_your_basic_price_id
VITE_STRIPE_PRICE_PREMIUM_MONTHLY=price_your_premium_price_id
VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY=price_your_enterprise_price_id
VITE_STRIPE_PRICE_CREDITS_5=price_your_5_credits_price_id
VITE_STRIPE_PRICE_CREDITS_15=price_your_15_credits_price_id
VITE_STRIPE_PRICE_CREDITS_30=price_your_30_credits_price_id
```

### 2. Install Dependencies

Make sure all required dependencies are installed:

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js react-hot-toast
```

### 3. Create Products and Prices in Stripe Dashboard

1. Log in to your Stripe Dashboard (https://dashboard.stripe.com/)
2. Navigate to Products > Add Product
3. Create products for your subscription plans and credit packages
4. For each product, create a price and note down the Price ID
5. Update the `.env` file with the corresponding Price IDs

### 4. Configure Webhooks (Optional but Recommended)

1. In Stripe Dashboard, go to Developers > Webhooks
2. Add an endpoint URL (e.g., `https://yourdomain.com/api/webhook`)
3. Select the following events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the signing secret and add it to your `.env` file as `VITE_STRIPE_WEBHOOK_SECRET`

## Implementation Details

### Components

- `StripeProvider`: Wraps the application to provide Stripe context
- `Pricing`: Displays subscription plans and credit packages with checkout functionality
- `Success`: Handles successful payment redirects

### API Routes

- `/api/create-checkout-session`: Creates a new Stripe Checkout session
- `/api/verify-purchase`: Verifies a completed purchase and updates the database

### Environment Variables

- `VITE_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `VITE_STRIPE_SECRET_KEY`: Your Stripe secret key
- `VITE_STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret
- `VITE_STRIPE_PRICE_*`: Price IDs for your products

## Testing

### Test Cards

Use the following test card numbers in Stripe test mode:

- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Decline after authentication: `4000 0000 0000 3220`

### Testing Webhooks Locally

1. Install the Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Log in: `stripe login`
3. Forward webhooks to your local server: `stripe listen --forward-to localhost:3000/api/webhook`
4. Use the webhook signing secret provided by the CLI

## Troubleshooting

- **Payments not processing**: Verify your Stripe API keys are correct and you're in the correct mode (test/live)
- **Webhook failures**: Check the Stripe Dashboard for webhook delivery attempts and error messages
- **Environment variables not loading**: Ensure your `.env` file is in the root directory and the server has been restarted after changes

## Security Considerations

- Never commit your `.env` file to version control
- Use environment variables for all sensitive information
- Implement proper error handling and logging
- Regularly rotate your API keys
- Follow Stripe's security best practices: https://stripe.com/docs/security/guide
