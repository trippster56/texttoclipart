import { supabase } from '../lib/supabase';
import { updateUserMembership } from '../services/aiService';

async function updateMembership(userId: string, tier: 'free' | 'basic' | 'premium' | 'enterprise') {
  try {
    console.log(`Updating membership for user ${userId} to ${tier}...`);
    
    // First, update the profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        membership_tier: tier,
        monthly_image_limit: {
          free: 3,
          basic: 100,
          premium: 1000,
          enterprise: 10000
        }[tier],
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      throw new Error(`Error updating profiles table: ${profileError.message}`);
    }

    // Then update the user_metadata in auth.users
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        membership: tier,
        updated_at: new Date().toISOString()
      }
    });

    if (authError) {
      console.warn('Note: Could not update auth.users table. This might require admin privileges.');
      console.warn('The profiles table has been updated, but you may need to update auth.users manually.');
    }

    console.log(`Successfully updated membership to ${tier}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating membership:', error);
    return { success: false, error };
  }
}

// Example usage:
// updateMembership('user-uuid-here', 'premium');

export { updateMembership };
