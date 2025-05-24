import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  redirectPath?: string;
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  redirectPath = '/login',
  children,
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const [isInitializing, setIsInitializing] = useState(true);
  
  console.log('[ProtectedRoute] Render - ', { 
    hasUser: !!user, 
    loading, 
    isAuthenticated, 
    pathname: location.pathname,
    isInitializing
  });

  // Track initial load to prevent premature redirects
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Show loading state
  if (loading || isInitializing) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login with the current path as redirectTo
  if (!isAuthenticated || !user) {
    // Don't redirect if we're already on the login page
    if (location.pathname === '/login') {
      return children ? <>{children}</> : <Outlet />;
    }
    
    const redirectUrl = `${redirectPath}?redirectTo=${encodeURIComponent(location.pathname + location.search)}`;
    console.log('[ProtectedRoute] Not authenticated, redirecting to login with redirectTo:', redirectUrl);
    return <Navigate to={redirectUrl} replace />;
  }

  console.log('Rendering protected content');
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
