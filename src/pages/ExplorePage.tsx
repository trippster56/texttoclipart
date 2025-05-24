import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Skeleton } from '../components/ui/skeleton';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

interface PublicImage {
  id: string;
  prompt: string;
  image_url: string;
  created_at: string;
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

const ExplorePage: React.FC = () => {
  const [images, setImages] = useState<PublicImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Handle authentication and redirect if needed
  useEffect(() => {
    // Only proceed with redirect/fetch after auth check is complete
    if (!authLoading) {
      if (!user) {
        navigate('/login', { 
          state: { 
            from: '/explore',
            message: 'Please sign in to view the explore page' 
          },
          replace: true
        });
      } else {
        // Only fetch images if user is authenticated
        fetchPublicImages();
      }
    }
  }, [user, authLoading, navigate]);

  const fetchPublicImages = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Only fetch public images for the explore page
      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .eq('privacy', 'public')
        .order('created_at', { ascending: false });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Error fetching images: ${error.message}`);
      }

      // Transform the data to match our PublicImage interface
      const typedData = (data || []).map(item => ({
        id: item.id,
        prompt: item.prompt,
        image_url: item.image_url,
        created_at: item.created_at,
        user: {
          id: item.user_id,
          email: item.user_email || 'user@example.com',
          user_metadata: {
            full_name: 'User',
            avatar_url: ''
          }
        }
      })) as PublicImage[];

      setImages(typedData);
      
      // If no data, show a helpful message
      if (data && data.length === 0) {
        setError('No public images found yet. Be the first to generate and share your clipart!');
      }
    } catch (err) {
      console.error('Error in fetchPublicImages:', err);
      setError(`Failed to load images: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPublicImages();
    }
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Skeleton className="h-12 w-12 rounded-full" />
          <span className="sr-only">Loading...</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <main className="min-h-screen bg-white py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  if (images.length === 0) {
    return (
      <Layout>
        <main className="min-h-screen bg-white py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">No images found</h1>
              <p className="text-gray-600">There are no public images to display yet.</p>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Explore Gallery</h1>
            <button
              onClick={fetchPublicImages}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <div key={image.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="relative pb-2/3">
                  <img
                    src={image.image_url}
                    alt={image.prompt}
                    className="w-full h-64 object-cover"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{image.prompt}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{formatDate(image.created_at)}</span>
                    <span>{image.user?.email?.split('@')[0] || 'Anonymous'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default ExplorePage;