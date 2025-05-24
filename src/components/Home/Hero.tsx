import React from 'react';
import { SparklesIcon } from './SparklesIcon';

const Hero: React.FC = () => {
  return (
    <div className="relative bg-gradient-to-b from-teal-50 to-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
          <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
            <div className="sm:text-center lg:text-left">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">Transform your ideas into</span>
                <span className="block text-teal-600">beautiful clipart</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                Create stunning, unique clipart from simple text prompts using the power of AI. Perfect for craft stickers, presentations, design, social media, blogs, and more.
              </p>
              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                <div className="rounded-md shadow">
                  <a
                    href="/create"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 md:py-4 md:text-lg md:px-10 transition duration-150 ease-in-out"
                  >
                    Start Creating
                  </a>
                </div>
            
              </div>
              <div className="mt-6 flex items-center">
                <SparklesIcon className="h-5 w-5 text-yellow-500" />
                <p className="ml-2 text-sm text-gray-500">
                  Powered by ChatGPT technology
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
      <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
        <div className="h-56 w-full bg-teal-100 sm:h-72 md:h-96 lg:w-full lg:h-full relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-transparent to-teal-100 animate-gradient-shift"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-4 p-4 max-w-lg">
              <div className="transform hover:scale-105 transition-transform shadow-lg rounded-lg overflow-hidden">
                <img
                  src="https://live.staticflickr.com/65535/54537863744_be44626e20_b.jpg"
                  alt="AI Generated Clipart"
                  className="w-full h-40 object-cover"
                />
              </div>
              <div className="transform hover:scale-105 transition-transform shadow-lg rounded-lg overflow-hidden">
                <img
                  src="https://live.staticflickr.com/65535/54535466063_58317ce17a_b.jpg"
                  alt="Glass of water clipart"
                  className="w-full h-40 object-cover"
                />
              </div>
              <div className="transform hover:scale-105 transition-transform shadow-lg rounded-lg overflow-hidden">
                <img
                  src="https://live.staticflickr.com/65535/54535575180_b3b7cdf8fe_b.jpg"
                  alt="Family kayaking clipart"
                  className="w-full h-40 object-cover"
                />
              </div>
              <div className="transform hover:scale-105 transition-transform shadow-lg rounded-lg overflow-hidden">
                <img
                  src="https://live.staticflickr.com/65535/54535235166_8957bd6609_b.jpg"
                  alt="Dog clipart"
                  className="w-full h-40 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;