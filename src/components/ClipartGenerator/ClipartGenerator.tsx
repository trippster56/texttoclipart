import React, { useState, useEffect } from 'react';
import { generateClipArt } from '../../services/aiService';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PromptForm from '../Create/PromptForm';
import { getCreditBalance } from '../../services/creditService';

const ClipartGenerator: React.FC = () => {
  const [error, setError] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quality, setQuality] = useState<'low' | 'high'>('low');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Fetch credit balance
  useEffect(() => {
    const fetchCreditBalance = async () => {
      if (!user) {
        return;
      }
      
      try {
        const balance = await getCreditBalance();
        setCreditBalance(balance);
      } catch (error) {
        console.error('Error fetching credit balance:', error);
        setCreditBalance(0);
      }
    };
    
    fetchCreditBalance();
  }, [user]);

  const hasEnoughCredits = (amount: number) => {
    return creditBalance >= amount;
  };

  const isPaidUser = user?.membership?.tier && ['basic', 'premium', 'enterprise'].includes(user.membership.tier);
  const isPremiumFeature = !isPaidUser && !hasEnoughCredits(1);
  
  const requiresCredit = (premiumFeature: boolean) => {
    return premiumFeature && !isPaidUser;
  };

  const handleGenerate = async (prompt: string, theme?: string) => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a description');
      return;
    }

    // Check if we need to use credits for any premium features
    const usingPremiumFeature = (quality === 'high' || privacy === 'private' || (theme && theme !== 'default')) && !isPaidUser;
    
    if (usingPremiumFeature && !hasEnoughCredits(1)) {
      setError('You need 1 credit to use premium features');
      return;
    }

    setIsGenerating(true);
    setError('');
    setImageUrl(null);
    setGeneratedImage(null);
    setIsCopied(false);

    try {
      console.log('Starting image generation with prompt:', prompt);
      const url = await generateClipArt(prompt, {
        user,
        quality,
        privacy,
        theme,
        // Pass the credit usage information to the API
        usesCredits: usingPremiumFeature ? 1 : 0
      });
      console.log('Received image data from API');
      
      if (!url) {
        throw new Error('No image data returned from the API');
      }
      
      // If the URL is a data URL, use it directly
      if (url.startsWith('data:image/')) {
        setImageUrl(url);
        setGeneratedImage(url);
      } else {
        // For regular URLs, add a timestamp to prevent caching
        const timestampedUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
        setImageUrl(timestampedUrl);
        setGeneratedImage(timestampedUrl);
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyUrl = () => {
    if (generatedImage) {
      navigator.clipboard.writeText(generatedImage);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      // Remove any query parameters from the URL before downloading
      const cleanUrl = generatedImage.split('?')[0];
      const link = document.createElement('a');
      link.href = cleanUrl;
      link.download = `clipart-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };



  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Generate Clipart</h2>
      
      <div className="mb-6">
        <PromptForm 
          onSubmit={handleGenerate} 
          isLoading={isGenerating} 
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
          <div className="space-y-2">
            <label className={`flex items-start p-2 rounded-md ${quality === 'low' ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
              <input
                type="radio"
                className="h-4 w-4 mt-1 text-indigo-600 focus:ring-indigo-500"
                checked={quality === 'low'}
                onChange={() => setQuality('low')}
                disabled={isGenerating}
              />
              <div className="ml-3">
                <span className={`block text-sm font-medium ${quality === 'low' ? 'text-indigo-800' : 'text-gray-700'}`}>
                  Standard
                </span>
                <span className="block text-xs text-gray-500">
                  Standard quality, no validation and fast generation.
                </span>
              </div>
            </label>
            <label 
              className={`flex items-start p-2 rounded-md cursor-pointer ${quality === 'high' ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'} ${isPremiumFeature ? 'opacity-60' : ''}`}
              onClick={(e) => {
                if (isPremiumFeature) {
                  e.preventDefault();
                  return;
                }
                setQuality(quality === 'high' ? 'low' : 'high');
              }}
            >
              <input
                type="radio"
                className={`h-4 w-4 mt-1 ${isPremiumFeature ? 'text-gray-400' : 'text-indigo-600 focus:ring-indigo-500'}`}
                checked={quality === 'high'}
                onChange={() => {}}
                disabled={isGenerating || isPremiumFeature}
              />
              <div className="ml-3">
                <div className="flex items-center">
                  <span className={`block text-sm font-medium ${quality === 'high' ? 'text-indigo-800' : 'text-gray-700'}`}>
                    Triple Validation
                  </span>
                  {requiresCredit(true) && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      1 credit
                    </span>
                  )}
                </div>
                <span className="block text-xs text-gray-500">
                  Validation to ensure the best possible results.
                </span>
                {isPremiumFeature && (
                  <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {hasEnoughCredits(1) ? 'Click to use 1 credit' : 'Not enough credits'}
                  </span>
                )}
              </div>
            </label>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Privacy</label>
          <div className="space-y-2">
            <label className={`flex items-center p-2 rounded-md ${privacy === 'public' ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
              <input
                type="radio"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                checked={privacy === 'public'}
                onChange={() => setPrivacy('public')}
                disabled={isGenerating}
              />
              <div className="ml-3">
                <span className={`block text-sm font-medium ${privacy === 'public' ? 'text-indigo-800' : 'text-gray-700'}`}>
                  Public
                </span>
                <span className="block text-xs text-gray-500">
                  Visible to everyone in the community
                </span>
              </div>
            </label>
            <label 
              className={`flex items-start p-2 rounded-md cursor-pointer ${privacy === 'private' ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'} ${isPremiumFeature ? 'opacity-60' : ''}`}
              onClick={(e) => {
                if (isPremiumFeature) {
                  e.preventDefault();
                  return;
                }
                setPrivacy(privacy === 'private' ? 'public' : 'private');
              }}
            >
              <input
                type="radio"
                className={`h-4 w-4 mt-1 ${isPremiumFeature ? 'text-gray-400' : 'text-indigo-600 focus:ring-indigo-500'}`}
                checked={privacy === 'private'}
                onChange={() => {}}
                disabled={isGenerating || isPremiumFeature}
              />
              <div className="ml-3">
                <div className="flex items-center">
                  <span className={`block text-sm font-medium ${privacy === 'private' ? 'text-indigo-800' : 'text-gray-700'}`}>
                    Private
                  </span>
                  {requiresCredit(true) && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      1 credit
                    </span>
                  )}
                </div>
                <span className="block text-xs text-gray-500">
                  Only visible to you in your dashboard
                </span>
                {isPremiumFeature && (
                  <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {hasEnoughCredits(1) ? 'Click to use 1 credit' : 'Not enough credits'}
                  </span>
                )}
              </div>
            </label>
          </div>
        </div>
      </div>

      {isGenerating && !imageUrl && (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {imageUrl && (
        <div className="mt-8">
          <div className="bg-gray-100 p-4 rounded-lg">
            <img 
              src={imageUrl} 
              alt="Generated clipart" 
              className="mx-auto max-h-96 max-w-full rounded"
              onError={() => {
                console.error('Error loading image:', imageUrl);
                setError('Failed to load the generated image');
              }}
            />
          </div>
          
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Download
            </button>
            <button
              onClick={handleCopyUrl}
              className={`flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isCopied ? 'bg-green-50 border-green-200 text-green-700' : ''
              }`}
            >
              {isCopied ? 'Copied!' : 'Copy URL'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClipartGenerator;