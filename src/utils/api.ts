import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('supabase.auth.token');
    if (token) {
      config.headers.Authorization = `Bearer ${JSON.parse(token).currentSession?.access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const createCheckoutSession = async (priceId: string, userId: string, type: 'subscription' | 'payment') => {
  try {
    const response = await api.post('/create-checkout-session', {
      priceId,
      userId,
      type,
    });
    return response.data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const verifyPurchase = async (sessionId: string, userId: string) => {
  try {
    const response = await api.post('/verify-purchase', {
      sessionId,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error('Error verifying purchase:', error);
    throw error;
  }
};

export const getUserSubscription = async (userId: string) => {
  try {
    const response = await api.get(`/user-subscription?userId=${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    throw error;
  }
};

export default api;
