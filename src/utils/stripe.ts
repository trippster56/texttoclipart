import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '', {
  locale: 'en', // Set the locale to English
});

export const handleCheckout = async (priceId: string, userId: string, type: 'subscription' | 'payment') => {
  try {
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to initialize');
    }

    // Get the current URL for success and cancel URLs
    const baseUrl = window.location.origin;
    
    // Create a checkout session using the Stripe client
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'mode': type === 'subscription' ? 'subscription' : 'payment',
        'success_url': `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${baseUrl}/pricing`,
        'client_reference_id': userId,
        'metadata[type]': type,
        'metadata[userId]': userId
      })
    });

    const session = await response.json();
    
    if (session.error) {
      throw new Error(session.error.message || 'Failed to create checkout session');
    }

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({
      sessionId: session.id
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
};
