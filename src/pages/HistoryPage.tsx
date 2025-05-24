import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import Navbar from '../components/Navigation/Navbar';
import Footer from '../components/Footer/Footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Download } from 'lucide-react';

interface UserImage {
  id: string;
  prompt: string;
  image_url: string;
  created_at: string;
  privacy: string;
  user_id: string;
}

const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userImages, setUserImages] = React.useState<UserImage[] | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [selectedImage, setSelectedImage] = React.useState<{
    url: string;
    prompt: string;
    privacy: string;
  } | null>(null);

  const ITEMS_PER_PAGE = 15;

  React.useEffect(() => {
    const fetchUserImages = async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      
      try {
        // First, get the total count of images
        const { count, error: countError } = await supabase
          .from('generated_images')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (countError) throw countError;
        
        // Calculate total pages
        const total = Math.ceil((count || 0) / ITEMS_PER_PAGE);
        setTotalPages(total || 1);
        
        // Then fetch the paginated data
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        
        const { data, error } = await supabase
          .from('generated_images')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;
        
        setUserImages((data as UserImage[]) || []);
      } catch (error) {
        console.error('Error fetching user images:', error);
        setUserImages([]);
      }
    };

    fetchUserImages();
  }, [user, navigate, currentPage]);

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 pt-20 pb-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Generation History</h1>
            <p className="text-sm text-gray-500 mt-1">
              Page {currentPage} of {totalPages}
            </p>
          </div>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Your Generated Clipart</CardTitle>
            <CardDescription>All your generated clipart in one place</CardDescription>
          </CardHeader>
          <CardContent>
            {userImages === null ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-600">Loading your clipart...</span>
              </div>
            ) : userImages.length === 0 ? (
              <p className="text-gray-500">You haven't generated any clipart yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {userImages.map((image) => (
                  <div 
                    key={image.id} 
                    className="relative group cursor-pointer"
                    onClick={() => setSelectedImage({
                      url: image.image_url,
                      prompt: image.prompt,
                      privacy: image.privacy
                    })}
                  >
                    <img
                      src={image.image_url}
                      alt={image.prompt}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 p-4 space-y-2">
                      <span className="text-white text-sm bg-black bg-opacity-70 px-2 py-1 rounded">
                        {image.privacy === 'public' ? 'Public' : 'Private'}
                      </span>
                      <span className="text-white text-sm text-center">
                        {image.prompt.length > 30 ? `${image.prompt.substring(0, 30)}...` : image.prompt}
                      </span>
                      <span className="text-white text-xs text-center">
                        Click to view
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {userImages && userImages.length > 0 && (
              <div className="flex justify-between items-center mt-6 border-t border-gray-200 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button 
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Image Preview</h2>
              <button 
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="relative w-full h-96 bg-white rounded-lg overflow-hidden border border-gray-200">
                <div className="w-full h-full flex items-center justify-center bg-white p-4">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.prompt}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">Prompt:</p>
                  <p className="font-medium text-gray-900">{selectedImage.prompt}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Status: <span className="font-medium">{selectedImage.privacy === 'public' ? 'Public' : 'Private'}</span>
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedImage.url;
                    link.download = `clipart-${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
