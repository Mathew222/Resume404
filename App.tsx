import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { Siren, Terminal, Coffee, Lock, Archive, HelpCircle, AlertCircle, CheckCircle } from 'lucide-react';
import RoastInput from './components/RoastInput';
import { LoadingState } from './types';

// Lazy load the heavy output component
const RoastOutput = React.lazy(() => import('./components/RoastOutput'));

const LOADING_MESSAGES = [
  "ANALYZING CRINGE LEVELS...",
  "DETECTING 'STRATEGIC THINKER' LIES...",
  "LAUGHING AT YOUR COMIC SANS...",
  "CALCULATING EMOTIONAL DAMAGE...",
  "READING YOUR GENERIC SUMMARY...",
  "PREPARING BRUTAL HONESTY...",
  "CONSULTING THE ROAST GODS...",
  "FINDING TYPOS YOU MISSED...",
  "JUDGING YOUR LIFE CHOICES...",
  "LOADING DISAPPOINTMENT...",
];

const ROAST_LIMIT_PER_DAY = 2;

// Simple string hash for caching
const generateHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

function App() {
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [roastContent, setRoastContent] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [roastCount, setRoastCount] = useState<number>(0);
  const [isCachedResult, setIsCachedResult] = useState(false);

  // Initialize and check daily limit
  useEffect(() => {
    const today = new Date().toDateString();
    const storedUsage = localStorage.getItem('roastUsage');

    if (storedUsage) {
      const { date, count } = JSON.parse(storedUsage);
      if (date === today) {
        setRoastCount(count);
      } else {
        // Reset for new day
        setRoastCount(0);
        localStorage.setItem('roastUsage', JSON.stringify({ date: today, count: 0 }));
      }
    } else {
      localStorage.setItem('roastUsage', JSON.stringify({ date: today, count: 0 }));
    }
  }, []);

  // Cycle loading messages
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (loadingState === LoadingState.READING || loadingState === LoadingState.ROASTING) {
      interval = setInterval(() => {
        setLoadingMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loadingState]);

  const handleRoast = useCallback(async (content: string, mimeType: string) => {

    // 1. Check Cache First (Free)
    const contentHash = generateHash(content);
    const cachedRoast = localStorage.getItem(`roast_cache_${contentHash}`);

    if (cachedRoast) {
      console.log("Cache hit! Serving saved roast.");
      setRoastContent(cachedRoast);
      setIsCachedResult(true);
      setLoadingState(LoadingState.SUCCESS);
      return;
    }

    // 2. Check Quota (If not cached)
    if (roastCount >= ROAST_LIMIT_PER_DAY) {
      setLoadingState(LoadingState.ERROR);
      return;
    }

    setIsCachedResult(false);
    setLoadingState(LoadingState.READING);
    setRoastContent('');

    try {
      // Dynamic import to avoid loading Gemini SDK on initial page load
      const { streamRoast } = await import('./services/geminiService');

      let buffer = "";

      await streamRoast(content, mimeType, (chunk) => {
        buffer += chunk;
      });

      setRoastContent(buffer);

      // 3. Save to Cache
      try {
        localStorage.setItem(`roast_cache_${contentHash}`, buffer);
      } catch (e) {
        // If local storage is full, clear old entries or ignore
        console.warn("Cache full, skipping save");
      }

      // 4. Increment Count & Save
      const newCount = roastCount + 1;
      setRoastCount(newCount);
      const today = new Date().toDateString();
      localStorage.setItem('roastUsage', JSON.stringify({ date: today, count: newCount }));

      setLoadingState(LoadingState.SUCCESS);

    } catch (error) {
      console.error(error);
      setLoadingState(LoadingState.ERROR);
    }
  }, [roastCount]);

  const handleReset = () => {
    setLoadingState(LoadingState.IDLE);
    setRoastContent('');
    setIsCachedResult(false);
  };

  const isLimitReached = roastCount >= ROAST_LIMIT_PER_DAY && loadingState === LoadingState.ERROR;

  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans relative border-x-4 md:border-x-[20px] border-ink transition-all">

      {/* Top Warning Marquee */}
      <div className="bg-ink text-paper overflow-hidden py-2 border-b-4 border-ink shrink-0">
        <div className="whitespace-nowrap animate-marquee font-bold tracking-widest text-xs md:text-sm">
          ERROR 404: TALENT NOT FOUND /// SYSTEM FAILURE: CRINGE DETECTED /// DO NOT ATTEMPT TO RESUBMIT WITHOUT RIZZ /// ABANDON HOPE ///
        </div>
      </div>

      {/* Header - Hides when roasting starts */}
      {loadingState === LoadingState.IDLE && (
        <header className="pt-8 md:pt-12 pb-4 md:pb-8 px-4 text-center border-b-4 border-ink bg-paper animate-fade-in-down">
          <div className="max-w-4xl mx-auto">
            <div className="border-4 border-ink p-4 md:p-6 shadow-hard bg-white transform -rotate-1">
              <div className="flex justify-between items-start border-b-2 border-ink pb-4 mb-4">
                <div className="text-left">
                  <h3 className="font-bold text-[10px] md:text-xs uppercase tracking-widest mb-1 text-alert">ROAST INCOMING</h3>
                  <h3 className="font-bold text-[10px] md:text-xs uppercase tracking-widest">Code: ID-10-T</h3>
                </div>
                {/* Buy Me Coffee Small Header Btn */}
                <a
                  href="https://buymeacoffee.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-yellow-400 border-2 border-ink px-3 py-1 font-bold text-[10px] md:text-xs uppercase hover:bg-yellow-300 transition-colors"
                  aria-label="Donate to support this free tool"
                >
                  <Coffee size={12} />
                  <span>Donate</span>
                </a>
              </div>

              <h1 className="text-5xl md:text-8xl font-display font-black uppercase leading-[0.85] tracking-tighter mb-4">
                RESUME<br />
                <span className="text-alert">404</span>
              </h1>

              <h2 className="font-bold uppercase tracking-widest text-xs md:text-base border-t-2 border-ink pt-4 mt-6 inline-block">
                <span className="bg-ink text-white px-2 py-1 mr-2">STATUS</span>
                THE BRUTAL AI RESUME ROASTER
              </h2>
            </div>

            <p className="mt-4 font-mono text-[10px] md:text-xs text-ink/60 uppercase font-bold">
              Daily Limit: {roastCount}/{ROAST_LIMIT_PER_DAY} Free Roasts Used
            </p>
          </div>
        </header>
      )}

      {/* Main Content Area - Increased max-width to 7xl for wider roast */}
      <main className={`flex-grow w-full px-2 md:px-4 py-8 md:py-12 max-w-7xl mx-auto relative z-10 flex flex-col ${loadingState !== LoadingState.IDLE ? 'justify-center' : ''}`}>

        {/* Input View */}
        {(loadingState === LoadingState.IDLE) && (
          <div className="max-w-4xl mx-auto w-full">
            <RoastInput onRoast={handleRoast} isLoading={false} />
            <p className="mt-4 text-center font-mono text-[10px] md:text-xs opacity-60 px-4">
              Note: Free AI usage has daily limits. If analysis fails, please try again tomorrow. <br />
              Duplicate resumes are cached and don't consume quota.
            </p>

            {/* SEO CONTENT SECTION - Visible but styled to match brutalism */}
            <section className="mt-16 md:mt-24 border-t-4 border-ink pt-8 md:pt-12 text-left">
              <div className="flex items-center gap-2 mb-6">
                <HelpCircle className="text-alert w-6 h-6" />
                <h3 className="font-display font-black text-xl md:text-2xl uppercase">Why Roast Your Resume?</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-8 font-mono text-sm md:text-base">
                <div className="bg-white border-2 border-ink p-4 shadow-hard-sm transform rotate-1">
                  <h4 className="font-bold uppercase mb-2 flex items-center gap-2">
                    <AlertCircle size={16} className="text-alert" />
                    Honest AI Feedback
                  </h4>
                  <p className="opacity-80">
                    Most recruiters won't tell you why they rejected you. Resume 404 is an <strong>AI Resume Checker</strong> that uses Google Gemini to destroy your CV with the brutal truth, identifying buzzwords, formatting errors, and weak bullet points.
                  </p>
                </div>

                <div className="bg-white border-2 border-ink p-4 shadow-hard-sm transform -rotate-1">
                  <h4 className="font-bold uppercase mb-2 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    Beat the ATS
                  </h4>
                  <p className="opacity-80">
                    Is your resume robot-friendly? Our <strong>Free ATS Scanner</strong> logic analyzes your document for readability. If our ruthless AI hates it, the Applicant Tracking Systems (ATS) will delete it too.
                  </p>
                </div>

                <div className="bg-white border-2 border-ink p-4 shadow-hard-sm">
                  <h4 className="font-bold uppercase mb-2">Who is this for?</h4>
                  <p className="opacity-80">
                    Job seekers, students, and anyone tired of ghosting. Whether you need a <strong>CV Review</strong>, a laugh, or a reality check, this tool provides instant, actionable (and hurtful) feedback.
                  </p>
                </div>

                <div className="bg-white border-2 border-ink p-4 shadow-hard-sm">
                  <h4 className="font-bold uppercase mb-2">How it Works</h4>
                  <p className="opacity-80">
                    Upload your PDF, DOCX, or paste text. Our <strong>Resume Analyzer</strong> scans for red flags, calculates an "Aura Score", and translates your corporate jargon into plain English. It's the roast you deserve.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Result View */}
        {loadingState === LoadingState.SUCCESS && (
          <div className="w-full relative">
            {isCachedResult && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-yellow-400 border-2 border-ink px-3 py-1 text-xs font-bold uppercase shadow-hard-sm flex items-center gap-2">
                <Archive size={14} /> Retrieved from Cache (Quota Saved)
              </div>
            )}
            <Suspense fallback={
              <div className="flex items-center justify-center p-12">
                <div className="font-mono text-ink font-bold animate-pulse">LOADING RESULTS...</div>
              </div>
            }>
              <RoastOutput
                roast={roastContent}
                loadingState={loadingState}
                onReset={handleReset}
              />
            </Suspense>
          </div>
        )}

        {/* Error / Limit View */}
        {loadingState === LoadingState.ERROR && (
          <div className="flex flex-col items-center justify-center py-20 text-center border-4 border-dashed border-alert bg-alert/5 relative z-10 mx-2 max-w-3xl mx-auto w-full">
            {isLimitReached ? (
              <>
                <Lock size={48} className="text-alert mb-6 md:w-16 md:h-16" />
                <h3 className="text-2xl md:text-3xl font-display font-black text-ink uppercase mb-2">QUOTA EXCEEDED</h3>
                <p className="font-bold text-alert uppercase text-sm md:text-base mb-6 max-w-lg mx-auto leading-relaxed">
                  You have reached the daily limit of {ROAST_LIMIT_PER_DAY} roasts.<br />
                  The AI is exhausted from judging people. <br />
                  Try again tomorrow or help keep the servers running.
                </p>
                <a
                  href="https://buymeacoffee.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 md:px-8 md:py-4 bg-yellow-400 text-ink font-display font-black uppercase tracking-widest hover:bg-yellow-300 border-4 border-ink shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all flex items-center gap-2"
                >
                  <Coffee size={24} />
                  <span>Buy Me A Coffee to Support</span>
                </a>
              </>
            ) : (
              <>
                <Siren size={48} className="text-alert mb-6 animate-pulse md:w-16 md:h-16" />
                <h3 className="text-2xl md:text-3xl font-display font-black text-ink uppercase mb-2">SYSTEM OVERLOAD</h3>
                <p className="font-bold text-alert uppercase text-sm md:text-base mb-8 max-w-lg mx-auto">
                  The AI servers are currently overwhelmed by bad resumes. <br />
                  Please wait a moment and try again.
                </p>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 md:px-8 md:py-4 bg-ink text-white font-display font-bold uppercase tracking-widest hover:bg-alert border-4 border-transparent hover:border-ink transition-colors shadow-hard text-sm md:text-base"
                >
                  Return to Safety
                </button>
              </>
            )}
          </div>
        )}

        {/* Brutalist Loading Overlay */}
        {(loadingState === LoadingState.READING || loadingState === LoadingState.ROASTING) && (
          <div className="flex flex-col items-center justify-center w-full my-auto">
            <div className="bg-ink text-white border-4 border-alert p-6 md:p-8 shadow-hard-lg max-w-md w-full relative overflow-hidden mx-4">

              {/* Scanline Effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none"></div>

              <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
                <Terminal size={20} className="text-alert animate-pulse md:w-6 md:h-6" />
                <span className="font-mono text-[10px] md:text-xs text-alert uppercase">System_Override::Roast_Mode</span>
              </div>

              <div className="font-mono text-xs md:text-sm space-y-2 mb-8 h-32 overflow-hidden flex flex-col justify-end">
                <p className="opacity-50">{'>'} Accessing File...</p>
                <p className="opacity-70">{'>'} Formatting sucks detected...</p>
                <p className="opacity-90">{'>'} {loadingMsg}</p>
                <p className="text-alert font-bold animate-pulse">{'>'} Processing_Insults.exe <span className="animate-blink">_</span></p>
              </div>

              <div className="h-6 w-full border-2 border-white bg-ink relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 bg-alert w-full animate-[marquee_2s_linear_infinite] origin-left scale-x-50"></div>
              </div>

              <p className="font-display font-black text-xl md:text-2xl uppercase mt-4 text-center tracking-widest">
                PLEASE WAIT
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="py-8 border-t-4 border-ink bg-paper-dark text-center px-4 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-[10px] md:text-xs font-bold uppercase">
          <div className="flex items-center gap-2 text-alert">
            <Siren size={14} />
            <span>Emotional Damage Likely</span>
          </div>
          <p>© 2024 DEPT OF DISAPPOINTMENT.</p>

          <a
            href="https://buymeacoffee.com"
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-ink px-3 py-2 bg-yellow-400 hover:bg-yellow-300 text-ink flex items-center gap-2 transition-transform hover:-translate-y-0.5 shadow-sm"
          >
            <Coffee size={14} />
            <span>Buy Me A Coffee</span>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;