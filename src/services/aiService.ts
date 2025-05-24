import OpenAI from 'openai';
import { supabase } from './supabaseClient';
import { useCredits, hasEnoughCredits, addCredits } from './creditService';

function getUserMembershipLevel(user: any): 'free' | 'basic' | 'premium' | 'enterprise' {
  // First check the membership object directly
  if (user?.membership?.tier) {
    const tier = user.membership.tier.toLowerCase();
    if (['basic', 'premium', 'enterprise'].includes(tier)) return tier as any;
  }
  
  // Fall back to user_metadata if available
  const level = user?.user_metadata?.membership?.toLowerCase();
  if (['basic', 'premium', 'enterprise'].includes(level)) return level as any;
  
  // Default to free
  return 'free';
}

// Feature flags are now managed in the database
// Each user's limits are stored in their profile

interface UsageInfo {
  count: number;
  limit: number;
  tier: string;
}

async function trackImageUsage(userId: string): Promise<UsageInfo> {
  try {
    console.log(`[DEBUG] Tracking image usage for user: ${userId}`);
    
    // First, get the user's active membership to determine their plan
    const { data: membershipData, error: membershipError } = await supabase
      .from('user_memberships')
      .select('plan_id, status, current_period_end')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString())
      .maybeSingle();

    if (membershipError) {
      console.error('[ERROR] Failed to fetch membership data:', membershipError);
      throw membershipError;
    }

    // Default to free tier if no active membership found
    const planId = membershipData?.plan_id?.toLowerCase() || 'free';
    console.log(`[DEBUG] User plan: ${planId}`);

    // Get the current month in YYYY-MM format
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get current usage for this month
    const { data: usageData, error: usageError } = await supabase
      .from('image_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('month', currentMonth)
      .maybeSingle();

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[ERROR] Failed to fetch image usage:', usageError);
      throw usageError;
    }

    const currentCount = usageData?.count || 0;
    
    // Set limits based on plan
    let monthlyLimit: number;
    switch(planId) {
      case 'basic':
        monthlyLimit = 30;
        break;
      case 'premium':
        monthlyLimit = 100;
        break;
      case 'enterprise':
        monthlyLimit = Infinity; // No limit for enterprise
        break;
      default: // free
        monthlyLimit = 3;
    }
    
    console.log(`[DEBUG] Current usage: ${currentCount}${monthlyLimit === Infinity ? '' : `/${monthlyLimit}`} for month ${currentMonth}`);
    
    return {
      count: currentCount,
      limit: monthlyLimit,
      tier: planId
    };
  } catch (error) {
    console.error('Error tracking image usage:', error);
    return { count: 0, limit: 3, tier: 'free' }; // Default to free tier on error
  }
}

// Function to update a user's membership
export async function updateUserMembership(
  userId: string, 
  tier: 'free' | 'basic' | 'premium' | 'enterprise'
): Promise<{ success: boolean }> {
  const limits = {
    free: 3,
    basic: 100,
    premium: 1000,
    enterprise: 10000
  };

  const { error } = await supabase
    .from('profiles')
    .update({
      membership_tier: tier,
      monthly_image_limit: limits[tier]
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating membership:', error);
    throw error;
  }

  return { success: true };
}

// Function to get current user usage
export async function getUserUsage(userId: string): Promise<UsageInfo> {
  try {
    // First, get the user's current membership level and usage
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('membership_tier, monthly_image_count, monthly_image_limit, last_reset_date')
      .eq('id', userId)
      .single();

    if (userError) throw userError;
    
    const now = new Date();
    const lastReset = userData.last_reset_date ? new Date(userData.last_reset_date) : null;
    
    // Check if we need to reset the counter (new month)
    if (!lastReset || lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      // Reset the counter for the new month
      const { error: resetError } = await supabase
        .from('profiles')
        .update({ 
          monthly_image_count: 0,
          last_reset_date: now.toISOString()
        })
        .eq('id', userId);
      
      if (resetError) throw resetError;
      
      return {
        count: 0,
        limit: userData.monthly_image_limit || 10,
        tier: userData.membership_tier || 'free'
      };
    }
    
    return {
      count: userData.monthly_image_count || 0,
      limit: userData.monthly_image_limit || 10,
      tier: userData.membership_tier || 'free'
    };
  } catch (error) {
    console.error('Error getting user usage:', error);
    return { count: 0, limit: 10, tier: 'free' };
  }
}

// Get API key from environment
const apiKey = import.meta.env.VITE_OPENAI_API_KEY?.trim();

if (!apiKey) {
  const errorMsg = 'OpenAI API key is not set. Please check your .env file and ensure it starts with VITE_ prefix.';
  console.error(errorMsg);
  throw new Error(errorMsg);
}

// Log the first few and last few characters of the API key for verification
const logApiKey = (key: string | undefined) => {
  if (!key) return 'Not found';
  if (key.length <= 8) return 'Invalid key length';
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
};

console.log('OpenAI API Key loaded:', logApiKey(apiKey));

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true, // Only for client-side usage
});

// Function to call the GPT Image API
async function generateImage(prompt: string, detail: 'low' | 'high' = 'low'): Promise<string> {
  console.log('[DEBUG] Starting generateImage with prompt and detail:', { prompt, detail });
  console.log('[DEBUG] API Key exists:', !!apiKey);
  
  try {
    console.log('[DEBUG] Calling GPT Image API with prompt:', prompt);
    
    // Validate API key
    if (!apiKey) {
      const errorMsg = 'OpenAI API key is not set';
      console.error('[ERROR]', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('[DEBUG] Sending request to OpenAI API...');
    
    const startTime = Date.now();
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
      quality: detail === 'high' ? 'hd' : 'standard',
      style: detail === 'high' ? 'vivid' : 'natural'
    });
    
    const endTime = Date.now();
    console.log(`[DEBUG] API call completed in ${endTime - startTime}ms`);
    console.log('[DEBUG] Raw API response:', JSON.stringify(response, null, 2));

    console.log('API Response:', JSON.stringify(response, null, 2));

    // Check if we have data and at least one image
    if (!response.data || !response.data[0]) {
      console.error('No data in response:', response);
      throw new Error('No image data in the API response');
    }

    // Handle both URL and b64_json response formats
    const imageData = response.data[0];
    
    if (imageData.url) {
      return imageData.url;
    } else if (imageData.b64_json) {
      // The API returns raw base64 data, ensure it's properly formatted as a data URL
      const base64Data = imageData.b64_json;
      // Create a proper data URL with the correct MIME type
      return `data:image/png;base64,${base64Data}`;
    } else {
      console.error('No URL or b64_json in response data:', response);
      throw new Error('No image URL or data in the API response');
    }
  } catch (error: unknown) {
    console.error('Error in generateImage:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate image');
  }
};

// Helper function to create enhanced prompts with theme support
const createEnhancedPrompt = (prompt: string, theme?: string): string => {
  // Remove any existing background specifications from the prompt
  const cleanPrompt = prompt
    .replace(/on\s+(a\s+)?(white|colored|)\s+background/gi, '')
    .replace(/with\s+(a\s+)?(white|colored|)\s+background/gi, '')
    .replace(/background\s*:\s*\w+/gi, '')
    .trim();

  // Base prompt
  let enhancedPrompt = `A single clean, centered clipart-style illustration of a ${cleanPrompt}`;

  // Add theme-specific styling
  switch (theme) {
    case 'comic':
      enhancedPrompt += `, in a bold comic book style with thick outlines, dynamic angles, and vibrant colors`;
      break;
    case 'realistic':
      enhancedPrompt += `, in a highly detailed and realistic style with accurate lighting and textures`;
      break;
    case 'abstract':
      enhancedPrompt += `, in an abstract geometric style with simplified shapes and bold colors`;
      break;
    case 'watercolor':
      enhancedPrompt += `, in a soft watercolor painting style with visible brush strokes and blending`;
      break;
    case 'pixel':
      enhancedPrompt += `, in a retro pixel art style with visible pixels and limited color palette`;
      break;
    default:
      // Default clipart style
      enhancedPrompt += `, created as a standalone digital sticker`;
  }

  return enhancedPrompt;
};

// Options for generating clipart
export interface GenerateClipArtOptions {
  user?: any;
  quality?: 'low' | 'high' | 'auto';
  privacy?: 'public' | 'private';
  theme?: string;
  usesCredits?: number;
}

function isPaidMember(level: string): boolean {
  return ['basic', 'premium', 'enterprise'].includes(level);
}

// Function to validate generated image meets quality requirements
async function validateImageQuality(imageUrl: string): Promise<boolean> {
  try {
    const validatePrompt = `
    Does this image meet all the following conditions?
    
    1. It contains only one subject.
    2. The subject is centered and fully visible.
    3. There are no color palettes, grids, multiple objects, or outline-only drafts.
    4. The background is a single flat color.
    5. There are no mockup effects, crop marks, or print layout elements.
    
    Respond only YES or NO.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 5,
      messages: [
        { 
          role: "user", 
          content: [
            { type: "text", text: validatePrompt },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
    });

    const validationResult = response.choices[0]?.message?.content?.trim().toUpperCase();
    return validationResult === 'YES';
  } catch (error) {
    console.error('Error validating image quality:', error);
    // If validation fails, we'll assume the image is valid to prevent blocking generation
    return true;
  }
}

// Main function to generate clipart
export async function generateClipArt(
  prompt: string, 
  options: GenerateClipArtOptions | any = {}
): Promise<string> {
  // Handle backward compatibility where user might be passed directly
  const { 
    user = null, 
    quality = 'low',  // Default to low quality
    privacy = 'public'  // Default to public
  } = typeof options === 'object' && !Array.isArray(options) && options !== null 
    ? options 
    : { user: options };
    
  // Get user's membership level
  const membershipLevel = user ? getUserMembershipLevel(user) : 'free';
  const isPaid = isPaidMember(membershipLevel);
  
  // Validate quality and privacy based on membership
  let effectiveQuality = quality === 'auto' ? 'low' : quality;
  if (effectiveQuality === 'high' && !isPaid) {
    effectiveQuality = 'low';
  }
  
  let effectivePrivacy: 'public' | 'private' = privacy === 'private' ? 'private' : 'public';
  if (effectivePrivacy === 'private' && !isPaid) {
    effectivePrivacy = 'public';
  }
  try {
    if (!prompt?.trim()) {
      throw new Error('Prompt is required');
    }

    console.log('Original prompt:', prompt);
    
    // Track image usage for all users
    if (user?.id) {
      const usage = await trackImageUsage(user.id);
      
      // Check if user has reached their monthly limit
      if (usage.count >= usage.limit) {
        // If user is on free tier, check if they have credits
        if (membershipLevel === 'free') {
          const hasCredits = await hasEnoughCredits(1);
          if (!hasCredits) {
            throw new Error(`You've reached your monthly limit of ${usage.limit} images. Upgrade your plan or purchase credits to generate more.`);
          }
        } else {
          throw new Error(`You've reached your monthly limit of ${usage.limit} images. Upgrade your plan to generate more.`);
        }
      }
    }

    // Check if credits should be used for premium features
    if (options.usesCredits && options.usesCredits > 0) {
      // Frontend already checked credits, just use them
      await useCredits(1, `Premium feature usage: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`);
    }

    // Create enhanced prompt with theme
    const enhancedPrompt = createEnhancedPrompt(prompt, options.theme);
    
    // Generate the image with retry logic for premium high-quality validation
    console.log('Generating image with prompt:', enhancedPrompt);
    const isPremiumHighQuality = quality === 'high' && isPaidMember(membershipLevel);
    const maxRetries = isPremiumHighQuality ? 3 : 1; // More retries for premium high quality
    let imageUrl: string | null = null;
    let isValid = false;
    let attempts = 0;

    // Check if we need to use credits (free tier users who have exceeded their limit)
    let usedCredits = false;
    let skipUsageTracking = false;
    
    if (user?.id) {
      const usage = await trackImageUsage(user.id);
      
      // Only check limits for free users who haven't used credits for this generation
      if (membershipLevel === 'free') {
        // If user is using credits for any premium feature, don't count against their limit
        const isUsingCreditsForFeature = options.usesCredits > 0;
        
        if (usage.count >= usage.limit && !isUsingCreditsForFeature) {
          // Check if user has enough credits to bypass the limit
          const hasCredits = await hasEnoughCredits(1);
          if (!hasCredits) {
            throw new Error(`You've reached your monthly limit of ${usage.limit} images. Upgrade your plan or purchase credits to generate more.`);
          }
          // Use 1 credit to bypass the limit
          await useCredits(1, `Bypassed monthly limit: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`);
          usedCredits = true;
          skipUsageTracking = true; // Don't count this against their monthly limit
        } else if (isUsingCreditsForFeature) {
          // If using credits for features, don't count against their limit
          skipUsageTracking = true;
        }
      }
    }

    while (attempts < maxRetries && !isValid) {
      attempts++;
      console.log(`Generation attempt ${attempts} of ${maxRetries}`);
      
      try {
        // Generate the image
        imageUrl = await generateImage(enhancedPrompt, quality);
        
        if (!imageUrl) {
          throw new Error('Failed to generate image');
        }

        // Only validate for premium members with high quality selected
        if (isPremiumHighQuality) {
          console.log('Premium high quality selected - validating image quality...');
          isValid = await validateImageQuality(imageUrl);
          
          if (!isValid && attempts < maxRetries) {
            console.log('Image validation failed, retrying...');
            // Small delay before retry to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } else {
          // For non-premium or non-high quality, skip validation
          isValid = true;
        }
      } catch (error) {
        // If we used credits and there was an error, refund the credit
        if (usedCredits && user?.id) {
          try {
            await addCredits(1, 'refund', `Refund for failed image generation: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`);
          } catch (refundError) {
            console.error('Failed to refund credits:', refundError);
          }
        }
        // If this was the last attempt, rethrow the error
        if (attempts >= maxRetries) {
          throw error;
        }
      }
    }

    if (!imageUrl) {
      throw new Error('Failed to generate a valid image after multiple attempts');
    }

    // Track image usage for the user (unless they used credits to bypass the limit)
    if (user?.id && !skipUsageTracking) {
      try {
        // Record the image usage for this month
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        try {
          // First, try to get the current count
          const { data: existingRecord, error: fetchError } = await supabase
            .from('image_usage')
            .select('count')
            .eq('user_id', user.id)
            .eq('month', currentMonth)
            .maybeSingle();
          
          if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
            throw fetchError;
          }
          
          const currentCount = existingRecord?.count || 0;
          
          // Upsert the record with the new count
          const { error: upsertError } = await supabase
            .from('image_usage')
            .upsert({
              user_id: user.id,
              month: currentMonth,
              count: currentCount + 1,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,month',
              count: 'exact'
            });
          
          if (upsertError) {
            console.error('Error updating image count:', upsertError);
          } else {
            console.log('Image usage recorded successfully');
          }
        } catch (error) {
          console.error('Error recording image usage:', error);
          // Don't fail the operation, but log the error for debugging
        }
      } catch (error) {
        console.error('Error tracking image usage:', error);
        // Don't fail the whole operation if tracking fails
        // The user still gets their image, we just might not track this usage
      }
    }

    return imageUrl;
  } catch (error) {
    console.error('Error in generateClipArt:', error);
    throw error;
  }
}

// For backward compatibility
export async function generateMultipleClipArts(
  prompt: string, 
  count: number = 1, 
  user: any = null
): Promise<string[]> {
  console.log(`Generating ${count} cliparts with prompt:`, prompt);
  
  if (count <= 0) {
    return [];
  }
  
  try {
    const results = [];
    for (let i = 0; i < count; i++) {
      const result = await generateClipArt(prompt, user);
      results.push(result);
    }
    return results;
  } catch (error: unknown) {
    console.error('Error in generateMultipleClipArts:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate multiple cliparts');
  }
}