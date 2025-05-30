// Use CommonJS require for better compatibility
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { buffer } = require('micro');

// Initialize Stripe with environment variable
const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-05-28.basil',
});

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

// Helper to get user ID from email
async function getUserIdByEmail(email) {
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
async function handleCheckoutSessionCompleted(session) {
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
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
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
async function handleSubscriptionUpdate(subscription) {
  try {
    console.log('Subscription updated:', subscription.id);
    
    // Get customer details from subscription
    const customer = await stripe.customers.retrieve(subscription.customer);
    if (!customer) {
      console.error('No customer found:', subscription.customer);
      return;
    }

    // Get user ID from email
    const userId = await getUserIdByEmail(customer.email);
    if (!userId) {
      console.error('No user found for email:', customer.email);
      return;
    }

    // Update user's subscription status in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: subscription.status,
        subscription_id: subscription.id,
        subscription_plan: subscription.items.data[0].price.id,
        subscription_end_date: subscription.current_period_end * 1000
      })
      .eq('id', userId);

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
async function handlePaymentFailed(invoice) {
  try {
    console.log('Payment failed for invoice:', invoice.id);
    
    // Get customer details from invoice
    const customer = await stripe.customers.retrieve(invoice.customer);
    if (!customer) {
      console.error('No customer found for invoice:', invoice.id);
      return;
    }

    // Get user ID from email
    const userId = await getUserIdByEmail(customer.email);
    if (!userId) {
      console.error('No user found for email:', customer.email);
      return;
    }

    // Update user's subscription status in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_status: 'past_due',
        subscription_end_date: null
      })
      .eq('id', userId);

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

// Helper function to get credits for a package
function getCreditsForPackage(packageId) {
  const packages = {
    'credit-5': 5,
    'credit-15': 15,
    'credit-30': 30
  };
  return packages[packageId] || 0;
}

// Main handler for Vercel Serverless Function
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      console.error('No Stripe signature found in headers');
      return res.status(400).json({ error: 'No Stripe signature' });
    }

    if (!process.env.VITE_STRIPE_SECRET_KEY) {
      console.error('Stripe secret key not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    if (!process.env.VITE_STRIPE_WEBHOOK_SECRET) {
      console.error('Stripe webhook secret not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        buf,
        sig,
        process.env.VITE_STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Processing Stripe event:', event.type);
    
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(event.data.object);
          break;
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error processing event:', error);
      return res.status(500).json({ error: 'Error processing webhook event' });
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Required for Vercel Serverless Functions
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
