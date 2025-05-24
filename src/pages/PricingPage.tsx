import React from 'react';
import Navbar from '../components/Navigation/Navbar';
import Pricing from '../components/Home/Pricing';
import Footer from '../components/Footer/Footer';

const PricingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default PricingPage;