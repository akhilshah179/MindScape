import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#06060a] font-sans transition-colors duration-500">
      <ThemeToggle />
      
      {/* ── Background Effects ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Animated Gradient Orbs */}
        <div 
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-violet-600/20 blur-[140px] rounded-full animate-pulse" 
          style={{ animationDuration: '8s' }} 
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[140px] rounded-full animate-pulse" 
          style={{ animationDuration: '10s', animationDelay: '2s' }} 
        />
        <div 
          className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-fuchsia-600/10 blur-[120px] rounded-full animate-pulse" 
          style={{ animationDuration: '12s', animationDelay: '4s' }} 
        />
        
        {/* Subtle Noise Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04] mix-blend-multiply dark:mix-blend-screen" 
          style={{ 
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' 
          }} 
        />
      </div>

      {/* ── Main Content ── */}
      <div className="relative z-10 text-center max-w-4xl px-6 w-full flex flex-col items-center">
        
        {/* Floating Icon */}
        <div className="mb-8 relative group">
          <div className="absolute inset-0 bg-violet-500/20 dark:bg-violet-500/30 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center backdrop-blur-xl shadow-xl dark:shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-transform duration-500 group-hover:scale-110">
            <svg className="w-8 h-8 text-violet-600 dark:text-white/90 drop-shadow-sm dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>

        {/* Hero Typography */}
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-tighter text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:via-white/90 dark:to-white/40 mb-6 drop-shadow-sm">
          StudyMate
        </h1>

        <p className="text-slate-600 dark:text-slate-400 text-lg sm:text-xl md:text-2xl font-medium tracking-wide mb-14 max-w-2xl mx-auto leading-relaxed">
          AI-powered learning assistant and coding arena — your complete study ecosystem.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto justify-center items-center">
          <button
            onClick={() => navigate('/signup')}
            className="group relative px-8 py-4 w-full sm:w-auto rounded-full bg-slate-900 dark:bg-white text-white dark:text-black font-semibold text-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-xl dark:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-2xl dark:hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-slate-900 dark:from-violet-100 dark:to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              Get Started
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </span>
          </button>
          
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 w-full sm:w-auto rounded-full bg-white/50 dark:bg-white/[0.03] hover:bg-white/80 dark:hover:bg-white/[0.08] text-slate-700 dark:text-white/90 font-medium text-lg backdrop-blur-xl border border-slate-200 dark:border-white/10 transition-all duration-300 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white hover:scale-[1.03] active:scale-[0.97] shadow-sm dark:shadow-none"
          >
            Log in
          </button>
        </div>

      </div>
    </div>
  );
}