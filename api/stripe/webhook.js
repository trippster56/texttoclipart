const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { buffer } = require('micro');

// Initialize Stripe with environment variable
const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

// Helper to get user ID from email or customer ID
async function getUserId(customerEmail, customerId) {
  try {
    // First try to find by email if available
    if (customerEmail) {
      const { data: emailUser, error: emailError } = await supabase
        .from('users')
        .select('id, stripe_customer_id')
        .eq('email', customerEmail)
        .single();

      if (emailUser && !emailError) {
        // Update customer ID if not set
        if (!emailUser.stripe_customer_id && customerId) {
          await supabase
            .from('users')
            .update({ stripe_customer_id: customerId })
            .eq('id', emailUser.id);
        }
        return emailUser.id;
      }
    }

    // If no email or user not found by email, try by customer ID
    if (customerId) {
      const { data: customerUser, error: customerError } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (customerUser && !customerError) {
        return customerUser.id;
      }
    }

    console.error('User not found for email/customer:', { customerEmail, customerId });
    return null;
  } catch (error) {
    console.error('Error in getUserId:', error);
    return null;
  }
}

// Handle successful checkout session
async function handleCheckoutSessionCompleted(session) {
  console.log('Checkout session completed:', session.id);
  
  try {
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    let customerEmail = session.customer_email;
    
    // If no email in session, try to get it from the customer object
    if ((!customerEmail || !customerId) && customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        customerEmail = customer.email || customerEmail;
      } catch (error) {
        console.error('Error fetching customer:', error);
      }
    }

    if (!customerEmail && !customerId) {
      console.error('No customer email or ID found in session');
      return;
    }

    const userId = await getUserId(customerEmail, customerId);
    if (!userId) {
      console.error('User not found for session:', session.id);
      return;
    }

    // Handle different types of checkouts
    if (session.mode === 'subscription' && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      await handleSubscriptionUpdate(subscription);
    } else if (session.mode === 'payment' && session.payment_intent) {
      // Handle one-time payment
      await handleSuccessfulPayment(session.payment_intent);
    }
  } catch (error) {
    console.error('Error in handleCheckoutSessionCompleted:', error);
  }
}

// Handle subscription events (created/updated)
async function handleSubscriptionUpdate(subscription) {
  console.log('Subscription event:', subscription.id);
  
  try {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
    if (!customerId) {
      console.error('No customer ID in subscription:', subscription.id);
      return;
    }

    // Get customer details
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer) {
      console.error('Customer not found for subscription:', subscription.id);
      return;
    }

    const userId = await getUserId(customer.email, customerId);
    if (!userId) {
      console.error('User not found for subscription:', subscription.id);
      return;
    }

    // Update user's subscription in database
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: subscription.status,
        subscription_id: subscription.id,
        subscription_plan: subscription.items.data[0]?.price.id,
        subscription_end_date: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
        stripe_customer_id: customerId
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating subscription:', error);
      return;
    }

    console.log('Subscription updated for user:', userId);
  } catch (error) {
    console.error('Error in handleSubscriptionUpdate:', error);
  }
}

// Handle successful payment
async function handleSuccessfulPayment(paymentIntentId) {
  console.log('Payment succeeded:', paymentIntentId);
  
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['invoice.subscription']
    });

    // Handle subscription payment
    if (paymentIntent.invoice?.subscription) {
      const subscription = await stripe.subscriptions.retrieve(paymentIntent.invoice.subscription);
      await handleSubscriptionUpdate(subscription);
    }
    
    // Handle one-time payment
    if (paymentIntent.metadata?.packageId) {
      const customerId = typeof paymentIntent.customer === 'string' ? paymentIntent.customer : paymentIntent.customer?.id;
      const customerEmail = paymentIntent.receipt_email;
      
      const userId = await getUserId(customerEmail, customerId);
      if (!userId) {
        console.error('User not found for payment intent:', paymentIntentId);
        return;
      }

      // Add credits or process the one-time purchase
      // This is where you'd add your credit logic
      console.log('Process one-time payment for user:', userId);
    }
  } catch (error) {
    console.error('Error in handleSuccessfulPayment:', error);
  }
}

// Handle invoice.paid event
async function handleInvoicePaid(invoice) {
  console.log('Invoice paid:', invoice.id);
  
  try {
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      await handleSubscriptionUpdate(subscription);
    }
  } catch (error) {
    console.error('Error in handleInvoicePaid:', error);
  }
}

// Handle payment failure
async function handlePaymentFailed(invoice) {
  console.log('Payment failed for invoice:', invoice.id);
  
  try {
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      await handleSubscriptionUpdate({
        ...subscription,
        status: 'past_due'
      });
    }
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }
}

// Main webhook handler
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
      // Handle the event based on type
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object);
          break;
          
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(event.data.object);
          break;
          
        case 'invoice.paid':
          await handleInvoicePaid(event.data.object);
          break;
          
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;
          
        case 'payment_intent.succeeded':
          await handleSuccessfulPayment(event.data.object.id);
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