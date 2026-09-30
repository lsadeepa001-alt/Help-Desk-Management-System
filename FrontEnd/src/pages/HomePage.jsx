import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LifeBuoy,
  Monitor,
  Wrench,
  ShieldCheck,
  FileText,
  CheckCircle,
  Clock,
  ArrowRight,
  BookOpen,
  MessageCircle,
  Menu,
  X,
  LogIn,
  UserPlus,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import Button from '../components/ui/Button';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const heroImage = '/images/uniassist-graduation-hero.jpg';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      {/* ── Public Header / Navigation ── */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/30 transition">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight block">
                UniAssist <span className="text-blue-400 font-normal">360</span>
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                University Support Portal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="#services" className="hover:text-white transition">Services</a>
            <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
            <a href="#self-service" className="hover:text-white transition">Self-Service</a>
          </nav>

          {/* Auth Controls */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/home">
                  <Button variant="outline" size="sm">
                    Go to Dashboard
                  </Button>
                </Link>
                <Link to="/create">
                  <Button variant="primary" size="sm" icon={FileText}>
                    Create Ticket
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" icon={LogIn}>
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm" icon={UserPlus}>
                    Create Account
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="sm:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-800 bg-slate-900/95 px-4 py-4 space-y-3">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-1"
            >
              Services
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-1"
            >
              How It Works
            </a>
            <a
              href="#self-service"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-1"
            >
              Self-Service
            </a>
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Link to="/home" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Link to="/create" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full" icon={FileText}>
                      Create Ticket
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full" icon={LogIn}>
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full" icon={UserPlus}>
                      Create Account
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1">
        {/* ── Hero Section with Graduation Photo & Glass Treatment ── */}
        <section className="relative overflow-hidden border-b border-slate-800/80 bg-slate-950">
          {/* Background image container with vignette & gradient overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src={heroImage}
              alt="University graduates celebrating outdoors"
              className="w-full h-full object-cover object-center lg:object-[center_30%]"
              loading="eager"
            />
            {/* Deep navy vignette and asymmetric gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40" />
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-slate-950/60 to-slate-950" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Glass Content Panel */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm">
                  <LifeBuoy className="w-3.5 h-3.5" />
                  <span>University Help Desk</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
                  University Support, <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
                    Simplified.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
                  Report issues, track progress, find answers, and stay informed through one central support portal for students, faculty, and administrative staff.
                </p>

                {/* Primary Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {isAuthenticated ? (
                    <>
                      <Button
                        variant="primary"
                        size="lg"
                        icon={FileText}
                        onClick={() => navigate('/create')}
                      >
                        Create Ticket
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        icon={ArrowRight}
                        onClick={() => navigate('/home')}
                      >
                        Go to Dashboard
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="lg"
                        icon={ArrowRight}
                        onClick={() => navigate('/register')}
                      >
                        Get Support
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        icon={LogIn}
                        onClick={() => navigate('/login')}
                      >
                        Sign In
                      </Button>
                    </>
                  )}
                </div>

                {/* Quick Indicators */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 max-w-lg">
                  <div>
                    <div className="text-xl font-bold text-white">3</div>
                    <div className="text-xs text-slate-400">Core Depts</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">Direct</div>
                    <div className="text-xs text-slate-400">Department Routing</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">SLA</div>
                    <div className="text-xs text-slate-400">Tracked Resolution</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Quick Access Glass Card */}
              <div className="lg:col-span-5">
                <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-blue-400" />
                      <span>Need Help?</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Fast-track your request or explore immediate solutions
                    </p>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => navigate(isAuthenticated ? '/create' : '/login')}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/40 text-left transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white group-hover:text-blue-300 transition">
                            Submit a Ticket
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Log IT, Maintenance, or Security issues
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(isAuthenticated ? '/my-tickets' : '/login')}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/40 text-left transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white group-hover:text-sky-300 transition">
                            Track My Tickets
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Check status updates and staff replies
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(isAuthenticated ? '/kb' : '/login')}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/40 text-left transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition">
                            Search Knowledge Base
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Self-service guides and verified answers
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition shrink-0" />
                    </button>
                  </div>

                  <div className="pt-2 text-center">
                    <p className="text-[11px] text-slate-400">
                      Sign in to access the Knowledge Base and Support Assistant.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Operational Service Areas ── */}
        <section id="services" className="py-16 sm:py-20 bg-slate-900/50 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-semibold text-blue-400 tracking-wider uppercase">
                Operational Scope
              </span>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Three Specialized Service Areas
              </h2>
              <p className="text-sm text-slate-400">
                UniAssist 360 directs tickets directly to university support teams according to operational domain.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* IT Support */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/30 transition shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Monitor className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">IT Support</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Accounts, connectivity, systems, hardware and software assistance across all university campuses.
                </p>
              </div>

              {/* Maintenance */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/30 transition shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Wrench className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Maintenance</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Facilities, equipment, lecture hall amenities, electrical and campus maintenance requests.
                </p>
              </div>

              {/* Security */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/30 transition shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Security</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Campus safety, key card access authorization, incident logging, and security-related support requests.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works Section ── */}
        <section id="how-it-works" className="py-16 sm:py-20 bg-slate-950 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-semibold text-blue-400 tracking-wider uppercase">
                Workflow
              </span>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                How It Works
              </h2>
              <p className="text-sm text-slate-400">
                A structured, transparent lifecycle ensures every support inquiry receives prompt attention and resolution.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: '01',
                  title: 'Submit',
                  desc: 'Describe the issue and attach supporting files or screenshots.',
                  icon: FileText,
                },
                {
                  step: '02',
                  title: 'Track',
                  desc: 'Follow assignment and real-time status updates from triage to investigation.',
                  icon: Clock,
                },
                {
                  step: '03',
                  title: 'Resolve',
                  desc: 'Support staff investigate, communicate, and record the verified resolution.',
                  icon: CheckCircle,
                },
                {
                  step: '04',
                  title: 'Feedback',
                  desc: 'Rate the completed support experience with Customer Satisfaction (CSAT).',
                  icon: Sparkles,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-blue-500/30">{item.step}</span>
                    <item.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Self-Service Section ── */}
        <section id="self-service" className="py-16 sm:py-20 bg-slate-900/40 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="text-xs font-semibold text-blue-400 tracking-wider uppercase">
                  Self-Service Knowledge
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Find Answers Faster
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Search verified help articles, step-by-step setup guides, and common FAQs curated by university Knowledge Managers before submitting a ticket.
                </p>
                <div className="pt-2">
                  {isAuthenticated ? (
                    <Button
                      variant="primary"
                      icon={BookOpen}
                      onClick={() => navigate('/kb')}
                    >
                      Browse Knowledge Base
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      icon={LogIn}
                      onClick={() => navigate('/login')}
                    >
                      Sign In to Access Self-Service
                    </Button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Knowledge Base</h4>
                  <p className="text-xs text-slate-400">
                    Department-scoped articles for IT setups, Wi-Fi, facility booking, and security procedures.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">Support Assistant</h4>
                  <p className="text-xs text-slate-400">
                    Interactive natural language assistance grounded in verified university knowledge articles.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final Call to Action ── */}
        <section className="py-16 sm:py-20 bg-slate-950 text-center">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Need Assistance?
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              Connect with your campus support teams or log in to check the status of existing inquiries.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {isAuthenticated ? (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    icon={FileText}
                    onClick={() => navigate('/create')}
                  >
                    Create Ticket
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    icon={ArrowRight}
                    onClick={() => navigate('/home')}
                  >
                    Go to Dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    icon={UserPlus}
                    onClick={() => navigate('/register')}
                  >
                    Create Account
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    icon={LogIn}
                    onClick={() => navigate('/login')}
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ── Institutional Footer ── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">UniAssist 360</span>
            <span>•</span>
            <span>University Support Portal</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#services" className="hover:text-slate-300 transition">Services</a>
            <a href="#how-it-works" className="hover:text-slate-300 transition">How It Works</a>
            <a href="#self-service" className="hover:text-slate-300 transition">Self-Service</a>
            {isAuthenticated ? (
              <Link to="/home" className="hover:text-slate-300 transition">Dashboard</Link>
            ) : (
              <Link to="/login" className="hover:text-slate-300 transition">Sign In</Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
