import React from 'react';
import Layout from '../components/Layout';

const FaqPage: React.FC = () => {
  const faqs = [
    {
      question: 'How does the clipart generation work?',
      answer: 'Our AI analyzes your text prompt and generates unique clipart based on the description you provide.'
    },
    {
      question: 'Is there a limit to how many cliparts I can generate?',
      answer: 'Free users can generate up to 5 cliparts per day. Premium users enjoy unlimited generations.'
    },
    {
      question: 'Can I use the generated cliparts commercially?',
      answer: 'Yes, all cliparts generated with a premium account can be used for commercial purposes. Free tier cliparts are for personal use only.'
    },
    {
      question: 'How do I download my cliparts?',
      answer: 'Simply click the download button below your generated clipart to save it to your device.'
    },
    {
      question: 'What file formats are supported?',
      answer: 'We support PNG and SVG formats for all generated cliparts.'
    }
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h1>
        
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">Still have questions?</h2>
          <p className="text-gray-600 mb-4">
            Contact our support team and we'll be happy to help!
          </p>
          <a 
            href="/contact" 
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Contact Support
          </a>
        </div>
      </div>
    </Layout>
  );
};

export default FaqPage;
