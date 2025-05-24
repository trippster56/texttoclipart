import React from 'react';
import { Download, Heart, Share2 } from 'lucide-react';

interface ResultsGalleryProps {
  results: Array<{
    id: string;
    imageUrl: string;
  }>;
  prompt: string;
  onDownload: (imageId: string) => void;
  onFavorite: (imageId: string) => void;
  onShare: (imageId: string) => void;
}

const ResultsGallery: React.FC<ResultsGalleryProps> = ({
  results,
  prompt,
  onDownload,
  onFavorite,
  onShare
}) => {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Your generated clipart</h2>
      <p className="text-sm text-gray-500 mb-6">
        Prompt: "{prompt}"
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((result) => (
          <div 
            key={result.id} 
            className="bg-white rounded-lg shadow-md overflow-hidden group transition-all duration-300 hover:shadow-lg"
          >
            <div className="relative aspect-w-1 aspect-h-1 bg-gray-100">
              <img 
                src={result.imageUrl} 
                alt={`Generated clipart for "${prompt}"`} 
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-4">
                  <button 
                    onClick={() => onDownload(result.id)}
                    className="p-2 bg-white rounded-full text-gray-700 hover:text-teal-600 transition-colors"
                    title="Download"
                  >
                    <Download className="h-6 w-6" />
                  </button>
                  <button 
                    onClick={() => onFavorite(result.id)}
                    className="p-2 bg-white rounded-full text-gray-700 hover:text-pink-600 transition-colors"
                    title="Favorite"
                  >
                    <Heart className="h-6 w-6" />
                  </button>
                  <button 
                    onClick={() => onShare(result.id)}
                    className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors"
                    title="Share"
                  >
                    <Share2 className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Created just now</span>
                <button 
                  onClick={() => onDownload(result.id)}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsGallery;