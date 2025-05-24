import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, User, LogOut } from 'lucide-react';
import Logo from './Logo';

// Create a separate component for the profile menu to isolate its hooks
const ProfileMenu: React.FC<{ user: any; onSignOut: () => void }> = ({ user, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-700 hover:text-teal-600 focus:outline-none"
      >
        <img 
          src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email?.split('@')[0] || 'U')}&background=random`} 
          alt={user?.name || 'User'} 
          className="h-8 w-8 rounded-full object-cover bg-gray-200"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email?.split('@')[0] || 'U')}&background=random`;
          }}
        />
        <span className="text-sm font-medium">{user?.name || user?.email?.split('@')[0] || 'User'}</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          <a 
            href="/dashboard" 
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            <User className="h-4 w-4 mr-2" />
            Dashboard
          </a>
          <button 
            onClick={() => {
              onSignOut();
              setIsOpen(false);
            }} 
            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

const Navbar: React.FC = () => {
  const { user, isAuthenticated, signOut, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Simple loading state
  if (loading) {
    return (
      <nav className="bg-white/80 backdrop-blur-md fixed w-full z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="w-32 h-8 bg-gray-200 rounded animate-pulse my-4"></div>
            <div className="flex items-center space-x-4">
              <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white/80 backdrop-blur-md fixed w-full z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Logo />
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <a href="/" className="text-teal-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Home
                </a>
                <a href="/explore" className="text-gray-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Explore
                </a>
                <a href="/pricing" className="text-gray-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Pricing
                </a>
                <a href="/how-it-works" className="text-gray-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  How It Works
                </a>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <a href="/create" className="bg-teal-500 text-white hover:bg-teal-600 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  Create Clipart
                </a>
                <ProfileMenu user={user} onSignOut={signOut} />
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <a href="/login" className="text-gray-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Log in
                </a>
                <a href="/signup" className="bg-teal-500 text-white hover:bg-teal-600 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  Sign up
                </a>
              </div>
            )}
          </div>
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-teal-600 focus:outline-none"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          <a
            href="/"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-teal-600 hover:bg-gray-50"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Home
          </a>
          <a
            href="/explore"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-teal-600 hover:bg-gray-50"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Explore
          </a>
          <a
            href="/pricing"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-teal-600 hover:bg-gray-50"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Pricing
          </a>
          <a
            href="/how-it-works"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-teal-600 hover:bg-gray-50"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            How It Works
          </a>
        </div>
        {isAuthenticated ? (
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <img
                  className="h-10 w-10 rounded-full"
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email?.split('@')[0] || 'U')}&background=random`}
                  alt={user?.name || 'User'}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email?.split('@')[0] || 'U')}&background=random`;
                  }}
                />
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {user?.name || user?.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-sm font-medium text-gray-500">
                  {user?.email}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <a
                href="/dashboard"
                className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-teal-600 hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </a>
              <a
                href="/create"
                className="block px-4 py-2 text-base font-medium text-gray-700 hover:text-teal-600 hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Create Clipart
              </a>
              <button
                onClick={() => {
                  signOut();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-700 hover:text-teal-600 hover:bg-gray-50"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="space-y-1">
              <a
                href="/login"
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-700 hover:text-teal-600 hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log in
              </a>
              <a
                href="/signup"
                className="block w-full text-left px-4 py-2 text-base font-medium text-teal-600 hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign up
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
