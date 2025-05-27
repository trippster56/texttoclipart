import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
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
    const { priceId, userId, type } = req.body;

    if (!priceId || !userId || !type) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: type === 'subscription' ? 'subscription' : 'payment',
      success_url: `${req.headers.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing`,
      client_reference_id: userId,
      metadata: {
        type,
        userId,
      },
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    return res.status(500).json({ 
      error: 'Error creating checkout session',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}
