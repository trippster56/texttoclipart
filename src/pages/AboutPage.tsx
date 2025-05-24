import Layout from '../components/Layout';
import { Users, Rocket, Heart } from 'lucide-react';

export default function AboutPage() {
  return (
    <Layout>
      <main className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              About Us
            </h1>
            <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
              We're on a mission to empower creativity and innovation through advanced AI technology.
            </p>
          </div>

          {/* Values Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Community First</h3>
              <p className="text-gray-600">
                We believe in building strong relationships with our users and fostering a supportive community.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Rocket className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Innovation</h3>
              <p className="text-gray-600">
                We're constantly pushing boundaries and exploring new possibilities in AI technology.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Passion</h3>
              <p className="text-gray-600">
                We're passionate about helping our users achieve their creative goals.
              </p>
            </div>
          </div>

          {/* Story Section */}
          <div className="prose prose-lg mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
            <p className="text-gray-600 mb-4">
              Founded with a vision to make AI technology accessible to everyone, we've grown into a platform that serves creators, innovators, and dreamers worldwide.
            </p>
            <p className="text-gray-600 mb-4">
              Our team consists of passionate individuals who believe in the power of technology to transform ideas into reality. We work tirelessly to provide the best possible experience for our users.
            </p>
            <p className="text-gray-600">
              As we continue to grow, our commitment to innovation, quality, and user satisfaction remains unwavering. We're excited about the future and the endless possibilities it holds.
            </p>
          </div>
        </div>
      </main>
    </Layout>
  );
}