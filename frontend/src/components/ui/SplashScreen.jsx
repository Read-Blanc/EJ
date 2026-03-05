import { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('enter'); // enter → hold → exit

  useEffect(() => {
    // step 1: fade in (CSS handles 0→1 on mount)
    const t1 = setTimeout(() => setPhase('hold'), 100);   // trigger fade-in
    const t2 = setTimeout(() => setPhase('exit'), 3200);  // start fade-out at 3.2s
    const t3 = setTimeout(() => onFinish(), 3800);        // hand off at 3.8s
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex items-center justify-center"
      style={{
        opacity:    phase === 'exit' ? 0 : 1,
        transition: phase === 'exit' ? 'opacity 0.6s ease' : 'none',
        pointerEvents: phase === 'exit' ? 'none' : 'all',
      }}
    >
      <div
        className="flex flex-col items-center gap-7"
        style={{
          opacity:    phase === 'enter' ? 0 : 1,
          transform:  phase === 'enter' ? 'translateY(10px)' : 'translateY(0)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        {/* Spinning ring with checkmark */}
        <div className="relative w-16 h-16">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 64" fill="none">
            {/* Track */}
            <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="3" />
            {/* Spinning arc — 2.5s full rotation, repeats until exit */}
            <circle
              cx="32" cy="32" r="28"
              stroke="#111111"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="175"
              strokeDashoffset="44"
              style={{
                transformOrigin: '32px 32px',
                animation: 'splashRotate 1.4s linear infinite',
              }}
            />
          </svg>
          {/* Logo mark inside */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
        </div>

        {/* Wordmark */}
        <div className="text-center">
          <div className="text-[30px] font-bold text-gray-950 tracking-tight leading-none">EvalAI</div>
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.22em] mt-1.5">
            Assessment Platform
          </div>
        </div>

        {/* Progress bar — takes exactly 3s to fill, matching the hold window */}
        <div className="w-28 h-[2px] bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 rounded-full"
            style={{ animation: 'splashBar 3s ease forwards' }}
          />
        </div>
      </div>

      <style>{`
        @keyframes splashRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes splashBar {
          from { width: 0%;   }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}