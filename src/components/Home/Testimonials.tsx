import React from 'react';

const testimonials = [
  {
    id: 1,
    quote: "ClipMagic has revolutionized how we create visual assets for our marketing campaigns. What used to take days now takes minutes!",
    author: "Sarah Johnson",
    role: "Marketing Director",
    company: "TechStart Inc.",
    avatarUrl: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150"
  },
  {
    id: 2,
    quote: "As a freelance designer, ClipMagic has become my secret weapon for creating unique illustrations for my clients. The quality is unmatched.",
    author: "David Chen",
    role: "Independent Designer",
    avatarUrl: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150"
  },
  {
    id: 3,
    quote: "Our education platform uses ClipMagic to create engaging visual content for our students. It's been a game-changer for our team.",
    author: "Michelle Torres",
    role: "Content Director",
    company: "EduLearn",
    avatarUrl: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150"
  },
];

const Testimonials: React.FC = () => {
  return (
    <div className="bg-teal-700 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Loved by creators everywhere
          </h2>
          <p className="mt-4 text-lg text-teal-100">
            See what our users are saying about their ClipMagic experience
          </p>
        </div>
        <div className="mt-12 space-y-8 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="lg:col-span-1">
              <div className="h-full flex flex-col justify-between bg-white rounded-lg shadow-lg p-8 transform transition duration-500 hover:-translate-y-1 hover:shadow-xl">
                <blockquote>
                  <div className="text-xl font-medium text-gray-900 mb-6">
                    <span className="text-5xl text-teal-400 leading-none">"</span>
                    <p className="mt-2">{testimonial.quote}</p>
                  </div>
                </blockquote>
                <div className="mt-6 flex items-center">
                  <div className="flex-shrink-0">
                    <img
                      className="h-12 w-12 rounded-full object-cover"
                      src={testimonial.avatarUrl}
                      alt={testimonial.author}
                    />
                  </div>
                  <div className="ml-4">
                    <div className="text-base font-medium text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-500">
                      {testimonial.role}
                      {testimonial.company && `, ${testimonial.company}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Testimonials;