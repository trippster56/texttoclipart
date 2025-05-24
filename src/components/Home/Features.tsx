import React from 'react';
import { Sparkles, ScanSearch, Download, Clock, Share2, Pencil } from 'lucide-react';

const features = [
  {
    name: 'AI-Powered Creation',
    description: 'Turn text prompts into stunning clipart using the advanced ChatGPT Sora AI technology.',
    icon: Sparkles,
  },
  {
    name: 'Unlimited Creativity',
    description: 'Create unique, custom clipart for any need - crafts, websites, social media, and more.',
    icon: Pencil,
  },
  {
    name: 'Instant Downloads',
    description: 'Download your creations instantly in multiple formats and resolutions.',
    icon: Download,
  },
  {
    name: 'Time-Saving',
    description: 'Get professional-quality clipart in seconds, not hours or days.',
    icon: Clock,
  },
  {
    name: 'Easy Sharing',
    description: 'Share your creations directly to social media or with your team.',
    icon: Share2,
  },
  {
    name: 'New Features',
    description: 'New features coming soon!',
    icon: ScanSearch,
  },
];

const Features: React.FC = () => {
  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-teal-600 font-semibold tracking-wide uppercase">Features</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need for amazing clipart
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Our AI-powered platform makes creating custom clipart easier than ever before.
          </p>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="group relative bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-500 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <span className="rounded-md inline-flex p-3 ring-4 ring-teal-50 text-teal-600 bg-teal-100 group-hover:bg-teal-200 transition-colors">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium">
                    <a href="#" className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      {feature.name}
                    </a>
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;