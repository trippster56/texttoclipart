import React from 'react';

const steps = [
  {
    id: '01',
    title: 'Write Your Prompt',
    description: 'Describe the clipart you want in natural language. Use our drop down menus for the best results.',
  },
  {
    id: '02',
    title: 'AI Generation',
    description: 'Our AI technology analyzes your prompt and creates clipart based on your description.',
  },
  {
    id: '03',
    title: 'Review & Edit',
    description: 'Preview your clipart and make adjustments to your prompt if needed.',
  },
  {
    id: '04',
    title: 'Download & Use',
    description: 'Download your clipart in your preferred format and use it in your content.',
  },
];

const HowItWorks: React.FC = () => {
  return (
    <div className="bg-gray-50 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-teal-600 font-semibold tracking-wide uppercase">Process</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            How ClipMagic Works
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Create stunning clipart in just a few simple steps
          </p>
        </div>

        <div className="mt-16">
          <div className="space-y-8 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-x-8">
            {steps.map((step) => (
              <div key={step.id} className="relative">
                <div className="group relative">
                  <div className="aspect-w-1 aspect-h-1">
                    <div className="rounded-full bg-teal-100 flex items-center justify-center h-24 w-24 mx-auto group-hover:bg-teal-200 transition-colors duration-300">
                      <span className="text-3xl font-bold text-teal-700">{step.id}</span>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <h3 className="text-lg font-medium text-gray-900">{step.title}</h3>
                    <p className="mt-2 text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
                {step.id !== '04' && (
                  <div className="hidden lg:block absolute top-12 left-full transform -translate-x-1/2">
                    <svg className="h-6 w-12 text-gray-300" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0 6H18" stroke="currentColor" strokeWidth="2" />
                      <path d="M18 1L23 6L18 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;