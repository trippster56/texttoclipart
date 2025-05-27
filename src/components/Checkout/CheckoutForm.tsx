'use client';

import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(999); // Amount in cents ($9.99)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create checkout session on the server
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: 'price_xxx', // Replace with your Stripe price ID
          userId: 'user_xxx', // Replace with actual user ID
          type: 'payment'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Payment Details</h2>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-4 mb-4 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount
          </label>
          <div className="mt-1">
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full"
              disabled
            />
          </div>
        </div>

        <div className="space-y-4">
          <label htmlFor="card-element" className="block text-sm font-medium text-gray-700">
            Credit or debit card
          </label>
          <CardElement
            id="card-element"
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                  iconColor: '#9e2146',
                },
              },
            }}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading || !stripe || !elements}
        >
          {loading ? 'Processing...' : 'Pay Now'}
        </Button>
      </form>
    </Card>
  );
}
