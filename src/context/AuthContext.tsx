import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

// Define the membership type
type MembershipTier = 'free' | 'basic' | 'premium' | 'enterprise';

interface UserMembership {
  tier: MembershipTier;
  imageCount: number;
  imageLimit: number;
  resetDate: string;
}

// Extend the User type to include name, avatar, and membership info
interface ExtendedUser extends Omit<User, 'user_metadata'> {
  name?: string;
  avatar?: string;
  membership: UserMembership;
  user_metadata: {
    [key: string]: any;
  };
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Handle auth state changes
  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    console.log('[AuthContext] Auth state changed - Event:', event, 'Has session:', !!session);
    
    if (session?.user) {
      console.log('[AuthContext] User session found');
      
      // Initialize default values
      let membershipTier: MembershipTier = 'free';
      let monthlyImageCount: number = 0;
      let lastResetDate: string = new Date().toISOString();
      let userName = session.user.email?.split('@')[0] || 'User';
      
      try {
        // First, ensure the profile exists
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        // If profile doesn't exist, create one
        if (profileError || !profileData) {
          console.log('[AuthContext] Profile not found, creating one...');
          
          // First, try to create the profile with a direct RPC call
          try {
            console.log('[AuthContext] Attempting to create profile with RPC...');
            const { data: newProfile, error: rpcError } = await supabase.rpc('create_user_profile', {
              user_id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || 
                        session.user.email?.split('@')[0] || 
                        'User',
              username: session.user.email?.split('@')[0] || 
                      `user${Math.random().toString(36).substring(2, 8)}`
            });

            if (rpcError) {
              console.error('[AuthContext] RPC profile creation failed, falling back to direct insert:', rpcError);
              
              // Fallback to direct insert if RPC fails
              const { data: insertedProfile, error: insertError } = await supabase
                .from('profiles')
                .insert([{
                  id: session.user.id,
                  full_name: session.user.user_metadata?.full_name || 
                             session.user.email?.split('@')[0] || 
                             'User',
                  username: session.user.email?.split('@')[0] || 
                           `user${Math.random().toString(36).substring(2, 8)}`,
                  updated_at: new Date().toISOString()
                }])
                .select()
                .single();

              if (insertError) {
                console.error('[AuthContext] Direct insert also failed:', insertError);
                if (insertError.code !== '23505') { // 23505 is unique_violation
                  throw insertError;
                } else {
                  console.log('[AuthContext] Profile already exists (race condition)');
                }
              } else {
                console.log('[AuthContext] Profile created successfully via direct insert');
              }
            } else {
              console.log('[AuthContext] Profile created successfully via RPC');
            }
          } catch (error) {
            console.error('[AuthContext] Error in profile creation:', error);
          }
        } else {
          console.log('[AuthContext] Profile found:', profileData);
          userName = profileData.full_name || userName;
        }

        // Get membership data with retry logic
        console.log('[AuthContext] Fetching membership data for user:', session.user.id);
        const fetchMembership = async (retries = 3, delay = 1000) => {
          for (let i = 0; i < retries; i++) {
            try {
              const { data, error } = await supabase
                .from('user_memberships')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
              
              if (!error && data) return data;
              if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
            } catch (error) {
              if (i === retries - 1) throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          return null;
        };

        try {
          const membershipData = await fetchMembership();
          if (membershipData) {
            console.log('[AuthContext] Membership data found:', membershipData);
            const planId = membershipData.plan_id as MembershipTier;
            membershipTier = ['free', 'basic', 'premium', 'enterprise'].includes(planId) ? planId : 'free';
          } else {
            console.log('[AuthContext] Using default membership tier: free');
          }
        } catch (error) {
          console.error('[AuthContext] Error fetching membership data:', error);
        }
        
      } catch (error) {
        console.error('[AuthContext] Error in auth state change:', error);
        // Continue with default values
      }
      
      // Define tier limits
      const tierLimits = {
        free: 3,
        basic: 25,
        premium: 100,
        enterprise: Infinity
      };
      
      console.log('[AuthContext] Setting membership tier to:', membershipTier);
      console.log('[AuthContext] Setting image limit to:', tierLimits[membershipTier as keyof typeof tierLimits] || 10);

      // Create the user object with membership info
      const userData: ExtendedUser = {
        ...session.user,
        name: userName,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`,
        membership: {
          tier: membershipTier,
          imageCount: monthlyImageCount,
          imageLimit: tierLimits[membershipTier as keyof typeof tierLimits] || 10,
          resetDate: lastResetDate
        },
        user_metadata: session.user.user_metadata || {}
      };
      
      console.log('[AuthContext] Setting user data and authentication state');
      setUser(userData);
      setSession(session);
      setIsAuthenticated(true);
      
    } else {
      console.log('[AuthContext] No user session found, resetting auth state');
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
    }
    
    setLoading(false);
  }, []);

  // Set up auth state listener on mount
  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }
        
        if (isMounted) {
          await handleAuthStateChange('INITIAL_SESSION', session);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initialize auth state
    initializeAuth();

    // Set up auth state change listener
    const { data } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isMounted) {
          handleAuthStateChange(event, session);
        }
      }
    );
    
    // Store the subscription
    subscription = { unsubscribe: data.subscription.unsubscribe };

    // Cleanup
    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [handleAuthStateChange]);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('[AuthContext] Attempting to sign in with email:', email);
      
      // First, sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) {
        console.error('[AuthContext] Authentication error:', authError);
        setLoading(false);
        return { error: authError };
      }

      console.log('[AuthContext] Authentication successful, waiting for auth state update...');
      
      // Wait for auth state to update with a timeout
      const authStateUpdated = await new Promise<boolean>((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max (50 * 100ms)
        
        const checkAuth = () => {
          attempts++;
          console.log(`[AuthContext] Checking auth state (attempt ${attempts}/${maxAttempts})`);
          
          if (isAuthenticated && user) {
            console.log('[AuthContext] Auth state updated successfully');
            resolve(true);
          } else if (attempts >= maxAttempts) {
            console.warn('[AuthContext] Auth state update timed out');
            resolve(false);
          } else {
            setTimeout(checkAuth, 100);
          }
        };
        
        checkAuth();
      });
      
      if (!authStateUpdated) {
        console.warn('[AuthContext] Proceeding despite auth state update timeout');
      }
      
      // Add a small delay to ensure all state is updated
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('[AuthContext] Sign in process completed');
      return { error: null };
      
    } catch (error) {
      console.error('[AuthContext] Error during sign in:', error);
      setLoading(false);
      return { 
        error: error instanceof Error ? error : new Error('An unknown error occurred during sign in') 
      };
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string) => {
    try {
      // First, sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signUpError) {
        return { error: signUpError };
      }

      // If signup was successful and we have a user, create a free membership
      if (data?.user) {
        console.log('[AuthContext] Creating free membership for new user:', data.user.id);
        
        try {
          // Call a database function to handle the membership creation
          // This bypasses RLS as we'll create a SECURITY DEFINER function
          const { data: insertData, error: membershipError } = await supabase.rpc('create_user_membership', {
            p_user_id: data.user.id,
            p_plan_id: 'free',
            p_status: 'active'
          });
          
          if (membershipError) {
            console.error('[AuthContext] Error creating free membership:', membershipError);
            console.error('[AuthContext] Error details:', {
              code: membershipError.code,
              hint: membershipError.hint,
              details: membershipError.details,
              message: membershipError.message
            });
          } else {
            console.log('[AuthContext] Successfully created free membership:', insertData);
          }
        } catch (error) {
          console.error('[AuthContext] Unexpected error during membership creation:', error);
        }
      }
      
      return { error: null };
    } catch (error) {
      console.error('[AuthContext] Error during signup:', error);
      return { error: error as Error };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (error) {
      console.error('Error in signOut:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;