import Stripe from 'stripe';
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export const config = {
  api: {
    bodyParser: false,
    method: ['POST']  // Only allow POST requests from Stripe
  },
};

export const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',  // Allow POST and OPTIONS (for CORS preflight)
  'Access-Control-Allow-Headers': 'Content-Type, stripe-signature'
};

// Helper to get user ID from email
async function getUserIdByEmail(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error getting user ID:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

// Handle successful checkout
async function handleCheckoutSessionCompleted(session: Stripe.Response<Stripe.Checkout.Session>) {
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
  try {
    console.log('Subscription updated:', subscription.id);
    
    // Get customer details from subscription
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if (!customer) {
      console.error('No customer found:', subscription.customer);
      return;
    }

    // Get user ID from email
    const customerData = customer as Stripe.Customer;
    const userId = await getUserIdByEmail(customerData.email!);
    if (!userId) {
      console.error('No user found for email:', customerData.email);
      return;
    }

    // Update user's subscription status in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: subscription.status,
        subscription_id: subscription.id,
        subscription_plan: subscription.items.data[0].plan.id,
        subscription_end_date: subscription.current_period_end * 1000
      })
      .eq('id', userId)
      .single();

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return;
    }

    console.log('Subscription updated successfully for user:', userId);
  } catch (error) {
    console.error('Error in handleSubscriptionUpdate:', error);
    throw error;
  }
}

// Handle failed payments
async function handlePaymentFailed(invoice: Stripe.Response<Stripe.Invoice>) {
  try {
    console.log('Payment failed for invoice:', invoice.id);
    
    // Get customer details from invoice
    const customer = await stripe.customers.retrieve(invoice.customer as string);
    if (!customer) {
      console.error('No customer found:', invoice.id);
      return;
    }

    // Get user ID from email
    const customerData = customer as Stripe.Customer;
    const userId = await getUserIdByEmail(customerData.email!);
    if (!userId) {
      console.error('No user found for email:', customerData.email);
      return;
    }

    // Update user's subscription status in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'past_due',
        subscription_end_date: null
      })
      .eq('id', userId)
      .single();

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return;
    }

    console.log('Payment failed status updated for user:', userId);
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
    throw error;
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

// Process Stripe events
async function processStripeEvent(event: Stripe.Event): Promise<void> {
  try {
    console.log('Processing Stripe event:', event.type);
    
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Response<Stripe.Checkout.Session>);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Response<Stripe.Subscription>);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Response<Stripe.Invoice>);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
        break;
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    throw error;
  }
}

// Main webhook handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request handled');
    res.status(200).end();
    return;
  }

  // Only allow POST requests from Stripe
  if (req.method !== 'POST') {
    console.error('Non-POST request received');
    res.setHeader('Allow', 'POST');
    res.status(405).json({ 
      error: 'Only POST requests are allowed from Stripe',
      allowed_methods: ['POST']
    });
    return;
  }

  try {
    // Get Stripe signature
    const sig = req.headers['stripe-signature'] as string | undefined;
    if (!sig) {
      console.error('No Stripe signature provided');
      res.status(400).json({ error: 'Missing Stripe signature' });
      return;
    }

    // Get raw body
    const rawBody = await buffer(req);
    console.log('Raw body length:', rawBody.length);
    console.log('Stripe signature:', sig);

    // Verify webhook event
    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.VITE_STRIPE_WEBHOOK_SECRET || ''
    );
    console.log('Verified event:', event.id, event.type);

    // Process the event
    await processStripeEvent(event);
    
    // Return success status
    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(400).json({ error: 'Webhook processing error' });
  }
  }
}