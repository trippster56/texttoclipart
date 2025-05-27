import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { handleCheckout } from '../../utils/stripe';
import { toast } from 'react-hot-toast';
import { Check, Zap, CreditCard } from 'lucide-react';
import { subscriptionPlans, creditPackages } from '../../utils/mockData';
import { SubscriptionTier } from '../../types';

const Pricing: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'credits'>('subscriptions');
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  return (
    <div className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="sm:text-center">
          <h2 className="text-base font-semibold text-teal-600 tracking-wide uppercase">Pricing</h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            Flexible plans for every need
          </p>
          <p className="mt-4 text-xl text-gray-500 max-w-3xl mx-auto">
            Choose between monthly subscriptions or pay-as-you-go credits for ultimate flexibility.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-6 py-3 rounded-md text-sm font-medium flex items-center ${
                activeTab === 'subscriptions'
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Zap className="h-5 w-5 mr-2" />
              Subscriptions
            </button>
            <button
              onClick={() => setActiveTab('credits')}
              className={`px-6 py-3 rounded-md text-sm font-medium flex items-center ${
                activeTab === 'credits'
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Buy Credits
            </button>
          </div>
        </div>

        {/* Subscription Plans */}
        {activeTab === 'subscriptions' && (
          <div className="mt-12 space-y-12 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-x-6">
            {subscriptionPlans.map((plan) => (
              <div 
                key={plan.id} 
                className={`relative p-8 border rounded-2xl shadow-sm flex flex-col ${
                  plan.tier === 'premium' 
                    ? 'border-teal-500 ring-2 ring-teal-500' 
                    : 'border-gray-200 bg-white'
                } ${
                  (plan.tier === 'premium' || plan.tier === 'enterprise') ? 'opacity-60' : ''
                }`}
              >
                {(plan.tier === 'premium' || plan.tier === 'enterprise') ? (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 rounded-2xl"></div>
                ) : null}
                {plan.tier === 'premium' && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-teal-100 text-teal-600">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                  <p className="mt-4 flex items-baseline">
                    <span className="text-4xl font-extrabold text-gray-900">${plan.price}</span>
                    <span className="ml-1 text-xl font-semibold text-gray-500">/month</span>
                  </p>
                  <p className="mt-6 text-gray-500">
                    {plan.imagesPerMonth === 1000 ? 'Unlimited' : plan.imagesPerMonth} images per month
                  </p>

                  <ul className="mt-6 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex">
                        <Check className="flex-shrink-0 h-5 w-5 text-green-500" />
                        <span className="ml-3 text-sm text-gray-500">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative z-20 mt-8">
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      
                      if (!isAuthenticated) {
                        window.location.href = '/login';
                        return;
                      }

                      if (plan.tier === 'free') {
                        window.location.href = '/signup';
                        return;
                      }

                      if (plan.tier === 'premium' || plan.tier === 'enterprise') {
                        return;
                      }

                      try {
                        setIsLoading(prev => ({ ...prev, [plan.id]: true }));
                        // Get the appropriate price ID based on the plan
                        let priceId = '';
                        const tier = plan.tier as SubscriptionTier;
                        switch(tier) {
                          case 'basic':
                            priceId = import.meta.env.VITE_STRIPE_PRICE_BASIC_MONTHLY || '';
                            break;
                          case 'premium':
                            priceId = import.meta.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY || '';
                            break;
                          case 'enterprise':
                            priceId = import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY || '';
                            break;
                          default:
                            priceId = '';
                        }
                        
                        if (!priceId) {
                          throw new Error('Price ID not configured for this plan');
                        }
                        await handleCheckout(priceId, user!.id, 'subscription');
                      } catch (error) {
                        console.error('Error starting checkout:', error);
                        toast.error('Failed to start checkout. Please try again.');
                      } finally {
                        setIsLoading(prev => ({ ...prev, [plan.id]: false }));
                      }
                    }}
                    disabled={isLoading[plan.id] || plan.tier === 'premium' || plan.tier === 'enterprise'}
                    className={`w-full py-3 px-6 border rounded-md text-center font-medium ${
                      plan.tier === 'premium'
                        ? 'bg-teal-600 border-transparent text-white hover:bg-teal-700'
                        : (plan.tier === 'free' || plan.tier === 'basic')
                          ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          : 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
                    } ${
                      (plan.tier === 'premium' || plan.tier === 'enterprise') ? 'pointer-events-none' : ''
                    }`}
                  >
                    {isLoading[plan.id] ? (
                      'Processing...'
                    ) : plan.tier === 'free' ? (
                      'Sign up to get started'
                    ) : plan.tier === 'basic' ? (
                      'Get Started'
                    ) : (
                      'Coming Soon'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Credit Packages */}
        {activeTab === 'credits' && (
          <div className="mt-12 mx-auto max-w-3xl">
            <div className="bg-white shadow rounded-2xl overflow-hidden">
              <div className="px-6 py-8 sm:p-10 sm:pb-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900">Buy Credits</h3>
                  <p className="mt-4 text-lg text-gray-500">
                    Purchase credits and use them whenever you need them. Credits never expire.
                  </p>
                </div>

                <div className="mt-10 grid gap-6 sm:grid-cols-3">
                  {creditPackages.map((pkg) => (
                    <div 
                      key={pkg.id} 
                      className="border border-gray-200 rounded-lg p-6 flex flex-col"
                    >
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">{pkg.name}</h4>
                        <div className="mt-4 flex items-baseline">
                          <span className="text-3xl font-extrabold text-gray-900">${pkg.price}</span>
                        </div>
                        <p className="mt-4 text-sm text-gray-500">
                          {pkg.credits} credits{pkg.bonus && pkg.bonus > 0 ? ` + ${pkg.bonus} bonus` : ''}
                        </p>
                        <p className="mt-2 text-sm text-gray-500">
                          ${(pkg.price / (pkg.credits + (pkg.bonus || 0))).toFixed(2)} per credit
                        </p>
                      </div>
                      <div className="mt-6">
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            
                            if (!isAuthenticated) {
                              window.location.href = '/login';
                              return;
                            }


                            try {
                              setIsLoading(prev => ({ ...prev, [pkg.id]: true }));
                              // Get the appropriate price ID based on the package
                              let priceId = '';
                              switch(pkg.id) {
                                case 'credit-5':
                                  priceId = import.meta.env.VITE_STRIPE_PRICE_CREDITS_STARTER || '';
                                  break;
                                case 'credit-15':
                                  priceId = import.meta.env.VITE_STRIPE_PRICE_CREDITS_CREATOR || '';
                                  break;
                                case 'credit-30':
                                  priceId = import.meta.env.VITE_STRIPE_PRICE_CREDITS_PRO || '';
                                  break;
                                default:
                                  priceId = '';
                              }
                              
                              if (!priceId) {
                                throw new Error('Price ID not configured for this package');
                              }
                              await handleCheckout(priceId, user!.id, 'payment');
                            } catch (error) {
                              console.error('Error starting checkout:', error);
                              toast.error('Failed to start checkout. Please try again.');
                            } finally {
                              setIsLoading(prev => ({ ...prev, [pkg.id]: false }));
                            }
                          }}
                          disabled={isLoading[pkg.id]}
                          className="w-full bg-teal-600 border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading[pkg.id] ? 'Processing...' : 'Buy Now'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
                <div className="text-center text-sm">
                  <p className="text-gray-500">
                    Need help choosing?{' '}
                    <a href="#" className="font-medium text-teal-600 hover:text-teal-500">
                      Contact our sales team
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pricing;