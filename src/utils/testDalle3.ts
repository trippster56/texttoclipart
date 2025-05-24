import { generateClipArt } from '../services/aiService';

export const testDalle3 = async () => {
  try {
    console.log('Testing DALL-E 3 API connection...');
    
    // Test with a simple prompt
    const testPrompt = 'A simple happy face';
    console.log('Sending test prompt:', testPrompt);
    
    const imageUrl = await generateClipArt(testPrompt);
    
    if (!imageUrl) {
      throw new Error('No image URL returned from the API');
    }
    
    console.log('DALL-E 3 API test successful!');
    return {
      success: true,
      imageUrl,
      message: 'Successfully connected to DALL-E 3 API'
    };
  } catch (error) {
    console.error('DALL-E 3 API test failed:', error);
    throw new Error(`DALL-E 3 API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export default testDalle3;
