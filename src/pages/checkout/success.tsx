import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const session_id = searchParams.get('session_id');
  const [message, setMessage] = useState('Verifying your purchase...');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!session_id) return;

    const verifyPurchase = async () => {
      try {
        const response = await fetch('/api/verify-purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: session_id, userId: user?.id }),
        });

        const data = await response.json();

        if (data.success) {
          setMessage('Purchase successful! Your credits have been added to your account.');
        } else {
          setMessage('Purchase verification failed. Please contact support if you have any issues.');
        }
      } catch (error) {
        console.error('Error verifying purchase:', error);
        setMessage('An error occurred while verifying your purchase. Please contact support if you have any issues.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyPurchase();
  }, [session_id, user?.id, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <CheckCircleIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
        </div>
        <h2 className="mt-3 text-2xl font-bold text-gray-900">
          {isLoading ? 'Processing...' : 'Thank you!'}
        </h2>
        <p className="mt-2 text-gray-600">{message}</p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => { window.location.href = '/dashboard'; }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
