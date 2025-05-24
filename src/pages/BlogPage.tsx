import React from 'react';
import Navbar from '../components/Navigation/Navbar';
import Footer from '../components/Footer/Footer';
import { Calendar, Clock, User } from 'lucide-react';

const blogPosts = [
  {
    id: 1,
    title: 'The Future of AI-Generated Clipart',
    excerpt: 'Explore how artificial intelligence is revolutionizing the way we create and use clipart in modern design.',
    author: 'Sarah Johnson',
    date: 'March 15, 2025',
    readTime: '5 min read',
    imageUrl: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1260',
    category: 'Technology'
  },
  {
    id: 2,
    title: 'Top 10 Tips for Creating Effective Clipart',
    excerpt: 'Learn the essential techniques and best practices for creating clipart that stands out and communicates effectively.',
    author: 'Michael Chen',
    date: 'March 12, 2025',
    readTime: '7 min read',
    imageUrl: 'https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?auto=compress&cs=tinysrgb&w=1260',
    category: 'Design Tips'
  },
  {
    id: 3,
    title: 'How Businesses Are Using Custom Clipart',
    excerpt: 'Discover how companies are leveraging custom clipart to enhance their brand identity and marketing materials.',
    author: 'Emily Rodriguez',
    date: 'March 10, 2025',
    readTime: '6 min read',
    imageUrl: 'https://images.pexels.com/photos/3334510/pexels-photo-3334510.jpeg?auto=compress&cs=tinysrgb&w=1260',
    category: 'Business'
  }
];

const BlogPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-16">
        <div className="bg-teal-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
                ClipMagic Blog
              </h1>
              <p className="mt-4 text-xl text-gray-600">
                Insights, tutorials, and updates from the world of AI-powered clipart creation
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="relative h-48">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
                      {post.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    <a href={`/blog/${post.id}`} className="hover:text-teal-600 transition-colors">
                      {post.title}
                    </a>
                  </h2>
                  <p className="text-gray-600 mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center text-sm text-gray-500">
                    <User className="h-4 w-4 mr-1" />
                    <span className="mr-4">{post.author}</span>
                    <Calendar className="h-4 w-4 mr-1" />
                    <span className="mr-4">{post.date}</span>
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 transition-colors">
              Load More Posts
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPage;