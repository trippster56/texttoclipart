import { buffer } from 'micro';
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to get user ID from email
async function getUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();
  
  return error ? null : data.id;
}

// Handle successful checkout
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);
  
  if (!session.customer_email) {
    console.error('No customer email in session');
    return;
  }

  const userId = await getUserIdByEmail(session.customer_email);
  if (!userId) {
    console.error('User not found for email:', session.customer_email);
    return;
  }

  if (session.mode === 'subscription' && session.subscription) {
    // Handle subscription
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await handleSubscriptionUpdate(subscription);
  } else if (session.metadata?.packageId) {
    // Handle credit purchase
    const packageId = session.metadata.packageId;
    const credits = getCreditsForPackage(packageId);
    
    if (credits > 0) {
      const { error } = await supabase.rpc('add_credits', {
        user_id: userId,
        amount: credits,
        transaction_type: 'purchase',
        description: `Purchased ${credits} credits`,
        reference_id: session.id
      });

      if (error) {
        console.error('Error adding credits:', error);
      } else {
        console.log(`Added ${credits} credits to user ${session.customer_email}`);
      }
    }
  }
}

// Handle subscription updates
async function handleSubscriptionUpdate(subscription: Stripe.Response<Stripe.Subscription>) {
  console.log('Subscription updated:', subscription.id);
  
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if (!customer.data.email) {
    console.error('No email found for customer:', subscription.customer);
    return;
  }

  const userId = await getUserIdByEmail(customer.email);
  if (!userId) {
    console.error('User not found for subscription:', customer.email);
    return;
  }

  // Get plan ID from the subscription
  const priceId = subscription.items.data[0].price.id;
  const planId = getPlanIdFromPriceId(priceId);

  // Update user's membership in the database
  const { error } = await supabase
    .from('user_memberships')
    .upsert({
      user_id: userId,
      plan_id: planId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'  // This ensures we update existing records
    });

  if (error) {
    console.error('Error updating membership:', error);
  } else {
    console.log(`Updated membership for user ${customer.email} to status ${subscription.status}`);
  }
}

// Handle failed payments
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed for invoice:', invoice.id);
  
  if (!invoice.customer_email) {
    console.error('No customer email in invoice');
    return;
  }

  const userId = await getUserIdByEmail(invoice.customer_email);
  if (!userId) {
    console.error('User not found for failed payment:', invoice.customer_email);
    return;
  }

  // Update membership status to past_due
  const { error } = await supabase
    .from('user_memberships')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating membership status:', error);
  } else {
    console.log(`Updated membership status to past_due for user ${invoice.customer_email}`);
  }
}

// Helper functions
function getCreditsForPackage(packageId: string): number {
  const packages: Record<string, number> = {
    'credit-5': 5,
    'credit-15': 15,
    'credit-30': 30
  };
  return packages[packageId] || 0;
}

function getPlanIdFromPriceId(priceId: string): string {
  // Map Stripe price IDs to your plan IDs
  const priceToPlanMap: Record<string, string> = {
    [process.env.VITE_STRIPE_PRICE_BASIC_MONTHLY || '']: 'basic',
    [process.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY || '']: 'premium',
    [process.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY || '']: 'enterprise'
  };
  return priceToPlanMap[priceId] || 'free';
}

// Main webhook handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Normalize URL to prevent redirects
  const normalizedUrl = req.url?.replace(/\/+$/, '');
  const host = req.headers.host || 'www.texttoclipart.com';
  const fullUrl = `https://${host}${normalizedUrl}`;
  
  console.log('Original Request URL:', req.url);
  console.log('Normalized Request URL:', normalizedUrl);
  console.log('Full Request URL:', fullUrl);
  console.log('Host:', host);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  console.log('\n=== NEW WEBHOOK REQUEST ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Original Request URL:', req.url);
  console.log('Normalized Request URL:', normalizedUrl);
  console.log('Request IP:', req.headers['x-forwarded-for'] || req.socket.remoteAddress);

  const sig = req.headers['stripe-signature'] as string;
  console.log('Stripe Signature:', sig);

  let event: Stripe.Event;

  try {
    const rawBody = await buffer(req);
    console.log('Raw Body Length:', rawBody.length);

    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.VITE_STRIPE_WEBHOOK_SECRET || ''
    );

    console.log('Webhook verified:', event.type);
    console.log('Event data:', JSON.stringify(event.data.object, null, 2));

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.paid':
        // Handle successful payment for subscription
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            typeof invoice.subscription === 'string' 
              ? invoice.subscription 
              : invoice.subscription.id
          );
          await handleSubscriptionUpdate(subscription);
        }
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Error processing webhook' });
  }
}