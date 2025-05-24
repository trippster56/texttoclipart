import React from 'react';

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-600">
              We take your privacy seriously. This policy describes what personal information we collect
              and how we use it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
            <ul className="list-disc pl-6 text-gray-600">
              <li className="mb-2">Account information (email, name)</li>
              <li className="mb-2">Usage data and analytics</li>
              <li className="mb-2">Device and browser information</li>
              <li className="mb-2">Communication preferences</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-gray-600">
              <li className="mb-2">Provide and improve our services</li>
              <li className="mb-2">Send important updates and notifications</li>
              <li className="mb-2">Personalize your experience</li>
              <li className="mb-2">Ensure platform security</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Protection</h2>
            <p className="text-gray-600">
              We implement appropriate technical and organizational security measures to protect your
              personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
            <p className="text-gray-600 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-600">
              <li className="mb-2">Access your personal data</li>
              <li className="mb-2">Correct inaccurate data</li>
              <li className="mb-2">Request data deletion</li>
              <li className="mb-2">Opt-out of communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-600">
              If you have any questions about this Privacy Policy, please contact us through our contact page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPage;