import React, { useState } from 'react';
import { Sparkles, Loader2, Image, Crown } from 'lucide-react';
import { promptSuggestions } from '../../utils/mockData';
import { useAuth } from '../../context/AuthContext';
import { getCreditBalance } from '../../services/creditService';

interface PromptFormProps {
  onSubmit: (prompt: string, theme?: string) => void;
  isLoading: boolean;
}

type Theme = 'default' | 'comic' | 'realistic' | 'abstract' | 'watercolor' | 'pixel';

const themeOptions: { value: Theme; label: string; premium: boolean }[] = [
  { value: 'default', label: 'Default Style', premium: false },
  { value: 'comic', label: 'Comic Book', premium: true },
  { value: 'realistic', label: 'Realistic', premium: true },
  { value: 'abstract', label: 'Abstract', premium: true },
  { value: 'watercolor', label: 'Watercolor', premium: true },
  { value: 'pixel', label: 'Pixel Art', premium: true },
];

const PromptForm: React.FC<PromptFormProps> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>('default');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showThemeTooltip, setShowThemeTooltip] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const { user } = useAuth();
  const isPaidUser = user?.membership?.tier && ['basic', 'premium', 'enterprise'].includes(user.membership.tier);
  
  // Check if user can use premium themes (either paid user or has credits)
  const canUsePremiumTheme = isPaidUser || creditBalance > 0;

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      // Only pass the theme if it's not default
      const themeToUse = selectedTheme !== 'default' ? selectedTheme : undefined;
      onSubmit(prompt.trim(), themeToUse);
    }
  };
  
  // Check if selected theme requires credits
  const selectedThemeOption = themeOptions.find(opt => opt.value === selectedTheme);
  const themeRequiresCredit = selectedThemeOption?.premium && !isPaidUser;

  // Fetch user's credit balance
  React.useEffect(() => {
    const fetchCreditBalance = async () => {
      if (!user) return;
      try {
        const balance = await getCreditBalance();
        setCreditBalance(balance);
      } catch (error) {
        console.error('Error fetching credit balance:', error);
      }
    };
    
    fetchCreditBalance();
  }, [user]);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const theme = e.target.value as Theme;
    
    // If theme is premium and user is not a paid user
    if (theme !== 'default' && !isPaidUser) {
      // If user has no credits, show tooltip
      if (creditBalance === 0) {
        setShowThemeTooltip(true);
        setTimeout(() => setShowThemeTooltip(false), 2000);
        return;
      }
      // If user has credits, we'll let them select it (credit will be deducted on submission)
    }
    setSelectedTheme(theme);
  }; 
  
  const getThemeStyles = (theme: Theme) => {
    // Use a consistent style for all themes when selected
    if (theme !== 'default') {
      return 'bg-teal-50 text-teal-800 border-teal-300';
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="w-full mb-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
            Describe your clipart
          </label>
          <div className="relative">
            <textarea
              id="prompt"
              name="prompt"
              rows={4}
              className="shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md p-4 pr-16"
              placeholder="E.g., A cute cartoon cat playing with a ball of yarn"
              value={prompt}
              onChange={handlePromptChange}
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                type="button"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                title="Get prompt suggestions"
              >
                <Sparkles className="h-5 w-5" />
              </button>
            </div>
          </div>
          {showSuggestions && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md overflow-hidden border border-gray-200">
              <ul className="py-1 max-h-60 overflow-auto">
                {promptSuggestions.map((suggestion, index) => (
                  <li 
                    key={index}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 cursor-pointer"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
          

          <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                Style Theme
              </label>
              {themeRequiresCredit && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  1 credit
                </span>
              )}
            </div>
            <div className="relative">
              <select
                id="theme"
                value={selectedTheme}
                onChange={handleThemeChange}
                className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm ${getThemeStyles(selectedTheme)}`}
              >
                {themeOptions.map((option) => {
                  const isDisabled = option.premium && !canUsePremiumTheme;
                  return (
                    <option 
                      key={option.value} 
                      value={option.value}
                      disabled={isDisabled}
                      className={option.premium ? 'text-purple-600' : ''}
                    >
                      {option.label} 
                      {option.premium && (
                        <>
                          {!isPaidUser && ' (1 credit)'}
                          {isPaidUser && ' ✨'}
                        </>
                      )}
                    </option>
                  );
                })}
              </select>
              {!isPaidUser && (
                <div className="absolute inset-y-0 right-0 pr-8 flex items-center pointer-events-none">
                  {selectedThemeOption?.premium ? (
                    <span className="text-purple-500">1</span>
                  ) : (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              )}
            </div>
            {showThemeTooltip && (
              <div className="mt-1 text-xs text-amber-600">
                {creditBalance > 0 
                  ? 'This theme will use 1 credit. You have ' + creditBalance + ' credit' + (creditBalance !== 1 ? 's' : '') + ' available.'
                  : 'Upgrade to Premium or purchase credits to unlock all themes!'}
              </div>
            )}
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isLoading || prompt.trim() === ''}
            className={`flex-1 flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
              prompt.trim() !== '' && !isLoading
                ? 'bg-teal-600 hover:bg-teal-700'
                : 'bg-teal-300 cursor-not-allowed'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors`}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Image className="h-5 w-5 mr-2" />
                Generate Clipart
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PromptForm;