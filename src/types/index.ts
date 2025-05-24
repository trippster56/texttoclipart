export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  subscription: SubscriptionTier;
  credits: number;
  createdAt: Date;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus?: number; // Optional bonus credits
}

export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'enterprise';

export interface Subscription {
  id: string;
  name: string;
  price: number;
  features: string[];
  imagesPerMonth: number;
  tier: SubscriptionTier;
}

export interface ClipartImage {
  id: string;
  prompt: string;
  imageUrl: string;
  userId: string;
  createdAt: Date;
  tags: string[];
  favorites: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}