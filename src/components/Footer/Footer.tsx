import React from 'react';
import Logo from '../Navigation/Logo';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8 xl:col-span-1">
            <Logo />
            <p className="text-gray-500 text-base">
              Transform your ideas into beautiful clipart with the power of AI.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">Solutions</h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <a href="/create" className="text-base text-gray-500 hover:text-gray-900">
                      Create Clipart
                    </a>
                  </li>
                  
                  <li>
                    <a href="/pricing" className="text-base text-gray-500 hover:text-gray-900">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a href="/how-it-works" className="text-base text-gray-500 hover:text-gray-900">
                      How It Works
                    </a>
                  </li>
                </ul>
              </div>
              <div className="mt-12 md:mt-0">
                <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">Support</h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <a href="/faq" className="text-base text-gray-500 hover:text-gray-900">
                      FAQ
                    </a>
                  </li>
                  <li>
                    <a href="/contact" className="text-base text-gray-500 hover:text-gray-900">
                      Contact Us
                    </a>
                  </li>
                
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">Company</h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <a href="/about" className="text-base text-gray-500 hover:text-gray-900">
                      About
                    </a>
                  </li>
                
              
                </ul>
              </div>
              <div className="mt-12 md:mt-0">
                <h3 className="text-sm font-semibold text-gray-500 tracking-wider uppercase">Legal</h3>
                <ul className="mt-4 space-y-4">
                  <li>
                    <a href="/privacy" className="text-base text-gray-500 hover:text-gray-900">
                      Privacy
                    </a>
                  </li>
                  <li>
                    <a href="/terms" className="text-base text-gray-500 hover:text-gray-900">
                      Terms
                    </a>
                  </li>
              
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-200 pt-8">
          <p className="text-base text-gray-400 xl:text-center">
            &copy; 2025 ClipMagic Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;