// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { getCreditBalance } from '../services/creditService';
import Navbar from '../components/Navigation/Navbar';
import Footer from '../components/Footer/Footer';
import ClipartGenerator from '../components/ClipartGenerator/ClipartGenerator';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Download, Zap } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<number>(0);
  const [maxImages, setMaxImages] = useState<number>(user?.membership?.imageLimit || 3);
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [isLoadingCredits, setIsLoadingCredits] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    prompt: string;
    privacy: string;
  } | null>(null);

  // Update maxImages when user's membership changes
  useEffect(() => {
    console.log('[Dashboard] User membership changed:', user?.membership);
    if (user?.membership) {
      console.log('[Dashboard] Setting max images to:', user.membership.imageLimit);
      setMaxImages(user.membership.imageLimit);
    } else {
      console.log('[Dashboard] No membership data available');
    }
  }, [user?.membership]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  // Fetch credit balance
  useEffect(() => {
    const fetchCreditBalance = async () => {
      if (!user) {
        console.log('[Dashboard] No user, skipping credit balance fetch');
        setIsLoadingCredits(false);
        return;
      }
      
      try {
        console.log('[Dashboard] Fetching credit balance for user:', user.id);
        const balance = await getCreditBalance();
        console.log('[Dashboard] Fetched credit balance:', balance);
        setCreditBalance(balance);
      } catch (error) {
        console.error('[Dashboard] Error fetching credit balance:', error);
        setCreditBalance(0);
      } finally {
        setIsLoadingCredits(false);
      }
    };
    
    fetchCreditBalance();
  }, [user]);

  useEffect(() => {
    const fetchUsage = async () => {
      if (!user) {
        console.log('[Dashboard] No user, skipping usage fetch');
        return;
      }

      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      console.log('[Dashboard] Fetching usage for month:', monthKey);

      try {
        // First try to get the count
        const { data: existing, error: fetchError } = await supabase
          .from('image_usage')
          .select('count')
          .eq('user_id', user.id)
          .eq('month', monthKey)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('[Dashboard] Error fetching usage:', fetchError);
          return;
        }

        if (existing) {
          console.log('[Dashboard] Found existing usage data:', existing);
          setUsage(existing.count);
        } else {
          // If no record exists, try to insert one
          const { data: newData, error: insertError } = await supabase
            .from('image_usage')
            .insert({
              user_id: user.id,
              month: monthKey,
              count: 0,
              updated_at: new Date().toISOString()
            })
            .select('count')
            .single();

          if (insertError) {
            if (insertError.code === '23505') {
              // If we get a unique violation, it means another request already inserted the record
              // Just fetch it again
              const { data: refetched } = await supabase
                .from('image_usage')
                .select('count')
                .eq('user_id', user.id)
                .eq('month', monthKey)
                .single();
              
              if (refetched) {
                console.log('[Dashboard] Found usage data after race condition:', refetched);
                setUsage(refetched.count);
              } else {
                console.error('[Dashboard] Failed to fetch usage after race condition');
                setUsage(0);
              }
            } else {
              console.error('[Dashboard] Error inserting usage record:', insertError);
            }
          } else if (newData) {
            console.log('[Dashboard] Created new usage record:', newData);
            setUsage(newData.count);
          }
        }
      } catch (error) {
        console.error('[Dashboard] Error in fetchUsage:', error);
      }
    };

    fetchUsage();
  }, [user]);

  // History feature temporarily disabled - Supabase connection commented out
  /*
  useEffect(() => {
    const fetchUserImages = async () => {
      if (!user) {
        setUserImages([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('generated_images')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setUserImages((data as UserImage[]) || []);
      } catch (error) {
        console.error('Error fetching user images:', error);
        setUserImages([]);
      }
    };

    fetchUserImages();
  }, [user]);
  */
  


  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 pt-20 pb-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Membership Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Membership</CardTitle>
              <CardDescription>Your current plan and usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Plan</p>
                  <p className="text-lg font-semibold">
                    {user?.membership?.tier ? 
                      user.membership.tier.charAt(0).toUpperCase() + user.membership.tier.slice(1) : 
                      'Free'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Images this month</p>
                  <p className="text-lg font-semibold">
                    {usage} / {maxImages === Infinity ? '∞' : maxImages}
                  </p>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center text-sm font-medium text-gray-500">
                    <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                    Credits Available
                  </div>
                  <p className="text-lg font-semibold flex items-center">
                    {isLoadingCredits ? (
                      <span className="h-6 w-12 bg-gray-200 rounded animate-pulse"></span>
                    ) : (
                      <>
                        {creditBalance} <span className="ml-1 text-sm font-normal text-gray-500">credits</span>
                        {creditBalance === 0 && (
                          <Button 
                            variant="link" 
                            className="ml-2 h-6 p-0 text-blue-600 hover:text-blue-800"
                            onClick={() => navigate('/pricing')}
                          >
                            Buy more
                          </Button>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/settings')}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Account Settings
                </button>
                <button 
                  onClick={() => navigate('/history')}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Generation History
                </button>
                <button 
                  onClick={handleSignOut}
                  className="w-full text-left p-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Generate New Clipart</CardTitle>
            <CardDescription>
              Create custom clipart using AI. {maxImages !== Infinity && `You have ${maxImages - usage} generations left this month.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClipartGenerator />
          </CardContent>
        </Card>

        <Card className="mt-6 relative">
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 rounded-lg"></div>
          <CardHeader>
            <CardTitle>Your Clipart <span className="text-sm font-normal text-gray-500">(Coming Soon)</span></CardTitle>
            <CardDescription>Your generated clipart will appear here</CardDescription>
          </CardHeader>
          <CardContent className="relative z-20 opacity-60">
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-700">History Coming Soon</h3>
                <p className="mt-1 text-sm text-gray-500">We're working on bringing you a better way to view your generated clipart.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />

      {/* Image Preview Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(open: boolean) => !open && setSelectedImage(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-gray-300 bg-white p-0">
          <div className="bg-white p-6 pb-4 border-b border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Image Preview
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-6">
            {selectedImage && (
              <>
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
                      if (selectedImage) {
                        const link = document.createElement('a');
                        link.href = selectedImage.url;
                        link.download = `clipart-${Date.now()}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
