import React from 'react';
import Layout from '../components/Layout';
import ClipartGenerator from '../components/ClipartGenerator/ClipartGenerator';
import EnvDebug from '../components/Debug/EnvDebug';

const CreatePage: React.FC = () => {

  return (
    <Layout>
      <EnvDebug />
      <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              Create Custom Clipart
            </h1>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Generate unique clipart with AI. Just describe what you have in mind!
            </p>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <ClipartGenerator />
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default CreatePage;