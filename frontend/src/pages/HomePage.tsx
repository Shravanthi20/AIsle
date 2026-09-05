import React from 'react';
import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 top-0 left-0 border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">AIsle</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-neutral-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/login" className="px-4 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 blur-[100px] rounded-full animate-pulse" style={{ animationDuration: '4s' }} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
            <span className="flex w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-medium text-indigo-300 uppercase tracking-wider">The Future of Commerce is Here</span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-8">
            Commerce, Orchestrated <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              by AI Agents
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-neutral-400 mb-10 leading-relaxed">
            AIsle connects buyers and merchants through autonomous AI. Enjoy highly personalized shopping experiences and automate your storefront's growth strategy with intelligent predictive analytics.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2">
              Explore as Buyer
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all flex items-center justify-center gap-2">
              Manage as Merchant
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Split Section */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16">
          
          {/* Buyer Features */}
          <div className="group relative p-8 rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-indigo-500/50 transition-colors overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-32 h-32 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4 text-white">For Buyers</h2>
              <p className="text-neutral-400 mb-8 leading-relaxed">
                Say goodbye to endless scrolling and rigid search bars. Chat with your personal AI concierge to find exactly what you need in seconds.
              </p>
              <ul className="space-y-4">
                {[
                  'Natural language intent extraction',
                  'Smart cross-sell and up-sell recommendations',
                  'Autonomous cart and checkout management',
                  'Frictionless conversational shopping'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-neutral-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Merchant Features */}
          <div className="group relative p-8 rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 hover:border-purple-500/50 transition-colors overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-32 h-32 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4 text-white">For Merchants</h2>
              <p className="text-neutral-400 mb-8 leading-relaxed">
                Turn your store's data into action. Predict revenue and let the AI autonomously orchestrate growth campaigns to maximize your profit.
              </p>
              <ul className="space-y-4">
                {[
                  '14-day linear regression revenue forecasting',
                  'LLM-powered Campaign Orchestrator',
                  'One-click automated marketing execution',
                  'Real-time inventory and top-seller analytics'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-neutral-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-900/10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-bold mb-6">Ready to upgrade your storefront?</h2>
          <p className="text-xl text-neutral-400 mb-10">Join the AI revolution today and experience commerce without friction.</p>
          <Link to="/login" className="px-10 py-5 rounded-full bg-white text-black text-lg font-bold hover:bg-neutral-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] inline-block">
            Start Your Journey Now
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10 text-center text-neutral-500 text-sm">
        <p>&copy; {new Date().getFullYear()} AIsle Commerce. All rights reserved.</p>
      </footer>
    </div>
  );
}
