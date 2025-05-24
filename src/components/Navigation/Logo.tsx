import React from 'react';
import { Palette } from 'lucide-react';

const Logo: React.FC = () => {
  return (
    <a href="/" className="flex items-center">
      <Palette className="h-8 w-8 text-teal-500" />
      <span className="ml-2 text-xl font-bold text-gray-900">ClipMagic</span>
    </a>
  );
};

export default Logo;