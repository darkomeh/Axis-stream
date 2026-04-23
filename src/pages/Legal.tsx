import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const policies = {
  terms: {
    title: 'Terms of Service',
    content: `Effective Date: 2026\n\nWelcome to AXIS TV. By accessing or using our platform, you agree to be bound by these Terms of Service. All content on AXIS TV is provided by non-affiliated third parties. We do not host or upload any media files on our servers. Your continued use of the platform constitutes your agreement to these terms.`,
  },
  privacy: {
    title: 'Privacy Policy',
    content: `Effective Date: 2026\n\nAXIS TV respects your privacy. We collect minimal information required to personalize your experience, such as your watchlist and continue-watching state. These are stored locally and synced securely if you create an account. We do not sell your personal data.`,
  },
  cookies: {
    title: 'Cookie Policy',
    content: `Effective Date: 2026\n\nAXIS TV uses essential cookies and local storage tokens to keep you logged in and to remember your preferences (like volume, subtitle settings, and watch history). By using our service, you consent to our use of these essential local storage mechanisms.`,
  },
  dmca: {
    title: 'DMCA Notice',
    content: `Effective Date: 2026\n\nAXIS TV functions strictly as a search engine and directory for media. We only link to and embed content provided by third-party services. If you hold copyright for any material and wish for it to be removed, please contact the respective third-party hosting service directly.`,
  }
};

export default function Legal() {
  const { type } = useParams<{ type: string }>();
  
  const policy = policies[type as keyof typeof policies] || policies.terms;

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12 md:px-12 md:py-24">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-widest">Back to Home</span>
        </Link>
        
        <div className="bg-[#121212] border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl">
          <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-8">{policy.title}</h1>
          <div className="prose prose-invert max-w-none">
            {policy.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-gray-300 leading-relaxed font-medium mb-6">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
