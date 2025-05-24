import React from 'react';
import Navbar from '../components/Navigation/Navbar';
import Footer from '../components/Footer/Footer';
import HowItWorks from '../components/Home/HowItWorks';

const HowItWorksPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-16">
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorksPage;