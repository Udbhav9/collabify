import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, Users, Sparkles, LayoutDashboard } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Navigation */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-indigo-500/20">
              C
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Collabify</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 my-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-8">
          <Sparkles className="w-3.5 h-3.5" /> Next-Gen Student Project Evaluation
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto mb-6">
          Transparent Team Collaboration & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400">AI-Powered Grading</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Eliminate free-riders in group projects. Collabify records real-time activity audit trails, individual student contribution analytics, and structured mentor evaluation workflows.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
          <Link to="/register" className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2">
            Start Your Project <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/login" className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl transition-all">
            Mentor & Teacher Login
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 transition-colors">
            <Users className="w-8 h-8 text-indigo-400 mb-4" />
            <h3 className="font-semibold text-lg text-white mb-2">Contribution Analytics</h3>
            <p className="text-slate-400 text-sm">Track granular student task completions and automated activity logs to evaluate real individual participation.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-violet-500/40 transition-colors">
            <ShieldCheck className="w-8 h-8 text-violet-400 mb-4" />
            <h3 className="font-semibold text-lg text-white mb-2">Mentor Remarks & Grading</h3>
            <p className="text-slate-400 text-sm">Dedicated mentor workspace allowing teachers to give feedback on overall projects and individual students.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-pink-500/40 transition-colors">
            <Sparkles className="w-8 h-8 text-pink-400 mb-4" />
            <h3 className="font-semibold text-lg text-white mb-2">AI Project Assistant</h3>
            <p className="text-slate-400 text-sm">Generate structured project scopes, descriptions, and granular task breakdowns instantly using AI.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Collabify Platform. Designed for modern academic excellence.
      </footer>
    </div>
  );
}