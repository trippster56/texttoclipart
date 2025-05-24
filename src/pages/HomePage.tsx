import React from 'react';
import Navbar from '../components/Navigation/Navbar';
import Hero from '../components/Home/Hero';
import Features from '../components/Home/Features';
import HowItWorks from '../components/Home/HowItWorks';
import Pricing from '../components/Home/Pricing';
// import Testimonials from '../components/Home/Testimonials';
import CtaSection from '../components/Home/CtaSection';
import Footer from '../components/Footer/Footer';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-4">
        <Hero />
        <div className="mt-16">
          <Features />
          <HowItWorks />
          <Pricing />
          {/* <Testimonials /> */}
          <CtaSection />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HomePage;