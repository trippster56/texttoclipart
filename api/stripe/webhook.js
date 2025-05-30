const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { buffer } = require('micro');

// Initialize Stripe with environment variable
const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Initialize Supabase clients with proper error handling
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables');
  process.exit(1);
}

// Regular client for public operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for auth operations (only if service key is available)
let supabaseAdmin = null;
if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  console.warn('VITE_SUPABASE_SERVICE_ROLE_KEY not set. Admin operations will be limited.');
}

// Helper to get user ID from email or customer ID
async function getUserId(customerEmail, customerId, metadata = {}) {
  console.log('Looking up user:', { customerEmail, customerId, metadata });
  
  try {
    // First, check if we have a userId in the metadata
    if (metadata && metadata.userId) {
      console.log('Using userId from metadata:', metadata.userId);
      return metadata.userId;
    }

    // If no metadata userId, try to find by customer ID first (most reliable)
    if (customerId) {
      console.log('Searching by customer ID in profiles:', customerId);
      
      // Look for the customer ID in the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      console.log('Profile lookup by customer ID result:', { profileData, profileError });

      if (profileData && !profileError) {
        return profileData.id;
      } else if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error looking up profile by customer ID:', profileError);
      }
    }

    // Fall back to email lookup if customer ID fails
    if (customerEmail) {
      console.log('Searching by email in auth.users:', customerEmail);
      
      // First try to find user by ID from metadata if available
      if (metadata && metadata.userId) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', metadata.userId)
          .single();

        if (profile && !profileError) {
          console.log(`Found user ${profile.id} using metadata`);
          return profile.id;
        }
      }

      // If admin client is available, try to find by email
      if (supabaseAdmin) {
        try {
          const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1,
            filter: `email = '${customerEmail.toLowerCase()}'`
          });

          if (users && users.length > 0) {
            console.log(`Found user ${users[0].id} by email using admin client`);
            return users[0].id;
          }
        } catch (error) {
          console.error('Error looking up user with admin client:', error);
        }
      }

      // Fallback: Try to find by email in public schema (if RLS allows)
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', customerEmail.toLowerCase())
        .maybeSingle();

      if (user && !userError) {
        console.log(`Found user ${user.id} by email in profiles table`);
        return user.id;
      }

      console.log('User not found by any method');
      return null;
    }

    // If no email or user not found by email, try by customer ID in profiles
    if (customerId) {
      console.log('Searching by customer ID in profiles:', customerId);
      
      // Look for the customer ID in the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      console.log('Profile lookup by customer ID result:', { profileData, profileError });

      if (profileData && !profileError) {
        return profileData.id;
      } else if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error looking up profile by customer ID:', profileError);
      }
    }

    console.log('User not found for email/customer:', { customerEmail, customerId });
    return null;
  } catch (error) {
    console.error('Error in getUserId:', error);
    return null;
  }
}

// Handle successful checkout session
async function handleCheckoutSessionCompleted(session) {
  console.log('Checkout session completed:', session.id);
  console.log('Session data:', JSON.stringify(session, null, 2));

  try {
    const customerEmail = session.customer_email || (session.customer_details?.email || null);
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    
    // Pass metadata to getUserId
    const userId = await getUserId(customerEmail, customerId, session.metadata || {});

    if (!userId) {
      console.error('User not found for session:', session.id);
      return;
    }

    console.log('Found user for session:', userId);
    // Here you would typically update the user's subscription status

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

// Helper function to get customer email from Stripe
async function getCustomerEmail(customer) {
  try {
    if (!customer) return null;
    
    const customerId = typeof customer === 'string' ? customer : customer.id;
    if (!customerId) return null;
    
    // If we already have the email in the customer object, use it
    if (customer.email) return customer.email;
    if (customer.customer_email) return customer.customer_email;
    
    // Otherwise, fetch the customer from Stripe
    const stripeCustomer = await stripe.customers.retrieve(customerId);
    return stripeCustomer.email || null;
  } catch (error) {
    console.error('Error getting customer email:', error);
    return null;
  }
}

// Handle subscription events (created, updated)
async function handleSubscriptionUpdate(subscription) {
  console.log('Subscription event:', subscription.id);

  try {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
    const customerEmail = await getCustomerEmail(subscription.customer);
    
    // For subscription updates, we might not have metadata, so we'll rely on customer ID
    const subUserId = await getUserId(customerEmail, customerId, subscription.metadata || {});

    if (!subUserId) {
      console.error('User not found for subscription:', subscription.id);
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

    // Update or create user membership
    const subscriptionData = {
      user_id: userId,
      plan_id: subscription.items.data[0]?.price.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };

    // Check if membership exists
    const { data: existingMembership, error: membershipError } = await supabase
      .from('user_memberships')
      .select('id')
      .eq('user_id', userId)
      .single();

    let error;
    if (existingMembership) {
      // Update existing membership
      const { error: updateError } = await supabase
        .from('user_memberships')
        .update(subscriptionData)
        .eq('id', existingMembership.id);
      error = updateError;
    } else {
      // Create new membership
      const { error: insertError } = await supabase
        .from('user_memberships')
        .insert([{ ...subscriptionData, id: subscription.id }]);
      error = insertError;
    }

    if (error) {
      console.error('Error updating membership:', error);
      return;
    }

    // Store stripe_customer_id in profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', subUserId);

    if (updateError) {
      console.error('Error updating profile with Stripe customer ID:', updateError);
    }

    console.log('Membership updated for user:', subUserId);
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
      
      // Update membership status to past_due
      const { error } = await supabase
        .from('user_memberships')
        .update({ 
          status: 'past_due',
          updated_at: new Date().toISOString() 
        })
        .eq('id', subscription.id);

      if (error) {
        console.error('Error updating membership status to past_due:', error);
      }
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