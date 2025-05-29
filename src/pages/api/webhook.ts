import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';

const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-05-28.basil',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export const config = {
  api: {
    bodyParser: false
  },
};

export const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
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
        subscription_end_date: subscription.items.data[0].current_period_end * 1000
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
async function handlePaymentFailed(invoice: Stripe.Invoice) {
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

export default async function handler(event: any) {
  console.log('Webhook received:', event);
  const request = event.request;
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, stripe-signature'
      }
    });
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    console.error('Non-POST request received');
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed', allowed_methods: ['POST'] }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Allow': 'POST'
        }
      }
    );
  }

  try {
    // Get Stripe signature
    const sig = request.headers.get('stripe-signature');
    if (!sig) {
      console.error('No Stripe signature provided');
      return new Response(
        JSON.stringify({ error: 'Missing Stripe signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get raw body
    const rawBody = await request.text();
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
    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing error' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get Stripe signature
    const sig = request.headers.get('stripe-signature');
    if (!sig) {
      console.error('No Stripe signature provided');
      return new Response(
        JSON.stringify({ error: 'Missing Stripe signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get raw body
    const rawBody = await request.arrayBuffer();
    console.log('Raw body length:', rawBody.byteLength);
    console.log('Stripe signature:', sig);

    // Verify webhook event
    const event = stripe.webhooks.constructEvent(
      Buffer.from(rawBody).toString(),
      sig,
      process.env.VITE_STRIPE_WEBHOOK_SECRET || ''
    );
    console.log('Verified event:', event.id, event.type);

    // Process the event
    await processStripeEvent(event);
    
    // Return success status
    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing error' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
