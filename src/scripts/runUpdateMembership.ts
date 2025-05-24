import { updateMembership } from './updateMembership';

// Replace these with your actual user ID and desired tier
const USER_ID = 'a8bfc8a5-b0eb-4c36-9075-3b6ca128e7dc'; // Replace with your user ID
const TIER = 'enterprise'; // Can be 'free', 'basic', 'premium', or 'enterprise'

async function main() {
  // First, sign in if needed (uncomment and modify with your credentials if needed)
  /*
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'your-email@example.com',
    password: 'your-password',
  });
  
  if (error) {
    console.error('Error signing in:', error);
    return;
  }
  */

  // Update the membership
  await updateMembership(USER_ID, TIER);
  
  console.log('Done!');
  process.exit(0);
}

main().catch(console.error);
