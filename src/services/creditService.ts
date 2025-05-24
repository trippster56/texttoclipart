import { supabase } from './supabaseClient';
import { CreditPackage } from '../types';

/**
 * Get the current user's credit balance
 * @returns The user's current credit balance
 */
export const getCreditBalance = async (): Promise<number> => {
  const { data, error } = await supabase
    .rpc('get_user_credits', { user_id: (await supabase.auth.getUser()).data.user?.id });
  
  if (error) {
    console.error('Error fetching credit balance:', error);
    return 0;
  }
  
  return data || 0;
};

/**
 * Check if the user has enough credits
 * @param requiredCredits The number of credits required
 * @returns Boolean indicating if the user has enough credits
 */
export const hasEnoughCredits = async (requiredCredits: number): Promise<boolean> => {
  const { data, error } = await supabase
    .rpc('has_sufficient_credits', { 
      user_id: (await supabase.auth.getUser()).data.user?.id,
      required_credits: requiredCredits 
    });
  
  if (error) {
    console.error('Error checking credit balance:', error);
    return false;
  }
  
  return data;
};

/**
 * Use credits from the user's balance
 * @param amount Number of credits to use
 * @param description Description of the credit usage
 * @param referenceId Optional reference ID (e.g., image ID)
 * @returns Transaction ID if successful
 */
export const useCredits = async (
  amount: number,
  description: string,
  referenceId?: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .rpc('use_credits', {
      user_id: (await supabase.auth.getUser()).data.user?.id,
      amount,
      description,
      reference_id: referenceId || null
    });
  
  if (error) {
    console.error('Error using credits:', error);
    throw new Error(error.message);
  }
  
  return data;
};

/**
 * Add credits to the user's balance
 * @param amount Number of credits to add
 * @param transactionType Type of transaction ('purchase', 'refund', 'bonus')
 * @param description Description of the credit addition
 * @param referenceId Optional reference ID (e.g., order ID)
 * @returns Transaction ID if successful
 */
export const addCredits = async (
  amount: number,
  transactionType: 'purchase' | 'refund' | 'bonus',
  description: string,
  referenceId?: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .rpc('add_credits', {
      user_id: (await supabase.auth.getUser()).data.user?.id,
      amount,
      transaction_type: transactionType,
      description,
      reference_id: referenceId || null
    });
  
  if (error) {
    console.error('Error adding credits:', error);
    throw new Error(error.message);
  }
  
  return data;
};

/**
 * Purchase a credit package
 * @param packageId The ID of the credit package to purchase
 * @returns Transaction ID if successful
 */
export const purchaseCredits = async (packageId: string): Promise<string | null> => {
  // In a real implementation, this would integrate with your payment processor
  // For now, we'll just add the credits directly
  
  // Find the package
  const pkg = creditPackages.find(p => p.id === packageId);
  if (!pkg) {
    throw new Error('Invalid credit package');
  }
  
  // Calculate total credits including any bonus
  const totalCredits = pkg.credits + (pkg.bonus || 0);
  
  // Add the credits
  return addCredits(
    totalCredits,
    'purchase',
    `Purchased ${pkg.name} (${totalCredits} credits)`,
    `pkg_${packageId}`
  );
};

/**
 * Get the user's credit transaction history
 * @param limit Number of transactions to return
 * @param offset Offset for pagination
 * @returns Array of credit transactions
 */
export const getCreditHistory = async (limit = 10, offset = 0) => {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    console.error('Error fetching credit history:', error);
    return [];
  }
  
  return data;
};
