import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any, // Using 'as any' to bypass the specific version requirement
});

// Initialize Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, userId } = req.body;

    if (!sessionId || !userId) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    // Verify the payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Payment not completed' });
    }

    // Get the price ID from the session
    const priceId = session.line_items?.data[0]?.price?.id;
    if (!priceId) {
      return res.status(400).json({ success: false, error: 'No price ID found in session' });
    }

    // Get the price details from Stripe to determine what was purchased
    const price = await stripe.prices.retrieve(priceId);
    const isSubscription = price.type === 'recurring';

    if (isSubscription) {
      // Handle subscription updates
      await handleSubscriptionUpdate(session, userId);
    } else {
      // Handle one-time payment (credits)
      await handleCreditPurchase(price, userId);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error verifying purchase:', error);
    return res.status(500).json({
      success: false,
      error: 'Error verifying purchase',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function handleSubscriptionUpdate(session: Stripe.Checkout.Session, userId: string) {
  // Get the subscription ID from the session
  const subscriptionId = session.subscription as string;
  
  // Get the subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  
  if (!priceId) {
    throw new Error('No price ID found in subscription');
  }

  // Map price IDs to subscription tiers
  const priceToTier: Record<string, string> = {
    // Add your Stripe price IDs and their corresponding tiers here
    // Example:
    // 'price_abc123': 'basic',
    // 'price_def456': 'premium',
  };

  const tier = priceToTier[priceId];
  
  if (!tier) {
    throw new Error(`Unknown price ID: ${priceId}`);
  }

  // Update the user's subscription in your database
  const { data, error } = await supabase
    .from('user_subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        price_id: priceId,
        tier,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error updating subscription in database:', error);
    throw error;
  }
}

async function handleCreditPurchase(price: Stripe.Price, userId: string) {
  // Map price IDs to credit amounts
  const priceToCredits: Record<string, number> = {
    // Add your Stripe price IDs and their corresponding credit amounts here
    // Example:
    // 'price_xyz123': 5, // Starter Pack
    // 'price_abc456': 15, // Creator Pack
    // 'price_def789': 30, // Pro Pack
  };

  const creditsToAdd = priceToCredits[price.id];
  
  if (creditsToAdd === undefined) {
    throw new Error(`Unknown price ID for credit purchase: ${price.id}`);
  }

  // Add credits to the user's account
  const { data: userData, error: fetchError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const currentCredits = userData?.credits || 0;
  const newCredits = currentCredits + creditsToAdd;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newCredits })
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }
}
