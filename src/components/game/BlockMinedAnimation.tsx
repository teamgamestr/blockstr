import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface BlockMinedAnimationProps {
  isActive: boolean;
  onComplete: () => void;
}

export function BlockMinedAnimation({ isActive, onComplete }: BlockMinedAnimationProps) {
  const [phase, setPhase] = useState<'entering' | 'cloud' | 'lightning' | 'complete'>('entering');

  useEffect(() => {
    if (!isActive) {
      setPhase('entering');
      return;
    }

    // Start with entering phase, immediately transition to cloud position
    setPhase('entering');

    // Small delay to allow initial render, then drop cloud
    const enterTimer = setTimeout(() => {
      setPhase('cloud');
    }, 50);

    // Phase 1: Cloud drops down (1 second) and stays (0.8 seconds)
    const cloudTimer = setTimeout(() => {
      setPhase('lightning');
    }, 1850); // 1s drop + 0.8s pause

    // Phase 2: Lightning strikes (1 second)
    const lightningTimer = setTimeout(() => {
      setPhase('complete');
    }, 2850);

    // Phase 3: Complete and callback (0.3 seconds fade)
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3150);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(cloudTimer);
      clearTimeout(lightningTimer);
      clearTimeout(completeTimer);
    };
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Cloud Animation - drops from top */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: phase === 'entering' ? '-250px' : '15%',
          transform: 'translate(-50%, 0)',
          opacity: phase === 'complete' ? 0 : 1,
          transition: phase === 'entering' ? 'none' : phase === 'complete' ? 'opacity 0.3s' : 'top 1s ease-out'
        }}
      >
        {/* 8-bit style cloud - much bigger */}
        <div className="relative" style={{ width: '400px', height: '200px' }}>
          {/* Cloud pixels - creating a retro cloud shape */}
          <div className="absolute inset-0">
            {/* Bottom row - widest part */}
            <div className="absolute bottom-0 left-16 w-80 h-12 bg-white border-4 border-gray-400"></div>

            {/* Second row */}
            <div className="absolute bottom-10 left-12 w-88 h-12 bg-white border-4 border-gray-400" style={{ width: '352px' }}></div>

            {/* Third row */}
            <div className="absolute bottom-20 left-16 w-80 h-12 bg-white border-4 border-gray-400"></div>

            {/* Top bumps - cloud puffs */}
            <div className="absolute bottom-28 left-20 w-16 h-16 bg-white border-4 border-gray-400"></div>
            <div className="absolute bottom-32 left-36 w-20 h-20 bg-white border-4 border-gray-400"></div>
            <div className="absolute bottom-32 left-56 w-24 h-24 bg-white border-4 border-gray-400"></div>
            <div className="absolute bottom-32 left-80 w-20 h-20 bg-white border-4 border-gray-400"></div>
            <div className="absolute bottom-28 left-96 w-16 h-16 bg-white border-4 border-gray-400"></div>

            {/* Shadow effect */}
            <div className="absolute bottom-0 left-16 w-80 h-2 bg-gray-500"></div>
          </div>

          {/* Text on cloud */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="font-retro text-black text-2xl text-center leading-tight pt-8 drop-shadow-lg">
              BITCOIN<br/>BLOCK<br/>MINED!
            </div>
          </div>
        </div>
      </div>

      {/* Lightning Animation - comes from cloud */}
      {(phase === 'lightning' || phase === 'complete') && (
        <>
          {/* Flash effect */}
          <div
            className={cn(
              "absolute inset-0 bg-yellow-200 transition-opacity",
              phase === 'lightning' ? 'opacity-60 duration-100' : 'opacity-0 duration-300'
            )}
          ></div>

          {/* Multiple lightning bolts coming from cloud position */}
          {/* Center lightning bolt */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '25%' }}>
            <svg
              width="60"
              height="600"
              viewBox="0 0 60 600"
              className={cn(
                "transition-opacity duration-200",
                phase === 'lightning' ? 'opacity-100' : 'opacity-0'
              )}
            >
              <g fill="#FFD700" stroke="#FFA500" strokeWidth="3">
                {/* Main bolt */}
                <rect x="24" y="0" width="12" height="60" />
                <rect x="36" y="60" width="12" height="60" />
                <rect x="12" y="120" width="12" height="60" />
                <rect x="30" y="180" width="12" height="60" />
                <rect x="18" y="240" width="12" height="60" />
                <rect x="27" y="300" width="12" height="60" />
                <rect x="21" y="360" width="12" height="60" />
                <rect x="24" y="420" width="12" height="60" />
                <rect x="27" y="480" width="12" height="60" />
                <rect x="24" y="540" width="12" height="60" />

                {/* Branches */}
                <rect x="42" y="150" width="18" height="12" />
                <rect x="0" y="270" width="18" height="12" />
                <rect x="39" y="330" width="15" height="12" />
                <rect x="6" y="450" width="15" height="12" />
              </g>
            </svg>
          </div>

          {/* Left lightning bolt */}
          <div className="absolute left-[35%]" style={{ top: '25%' }}>
            <svg
              width="50"
              height="500"
              viewBox="0 0 50 500"
              className={cn(
                "transition-opacity duration-200 delay-100",
                phase === 'lightning' ? 'opacity-90' : 'opacity-0'
              )}
            >
              <g fill="#FFD700" stroke="#FFA500" strokeWidth="3">
                <rect x="19" y="0" width="12" height="50" />
                <rect x="25" y="50" width="12" height="50" />
                <rect x="13" y="100" width="12" height="50" />
                <rect x="22" y="150" width="12" height="50" />
                <rect x="16" y="200" width="12" height="50" />
                <rect x="20" y="250" width="12" height="50" />
                <rect x="18" y="300" width="12" height="50" />
                <rect x="21" y="350" width="12" height="50" />
                <rect x="19" y="400" width="12" height="50" />
                <rect x="20" y="450" width="12" height="50" />

                {/* Branches */}
                <rect x="31" y="120" width="15" height="10" />
                <rect x="4" y="220" width="12" height="10" />
              </g>
            </svg>
          </div>

          {/* Right lightning bolt */}
          <div className="absolute left-[65%]" style={{ top: '25%' }}>
            <svg
              width="50"
              height="500"
              viewBox="0 0 50 500"
              className={cn(
                "transition-opacity duration-200 delay-150",
                phase === 'lightning' ? 'opacity-90' : 'opacity-0'
              )}
            >
              <g fill="#FFD700" stroke="#FFA500" strokeWidth="3">
                <rect x="19" y="0" width="12" height="50" />
                <rect x="13" y="50" width="12" height="50" />
                <rect x="25" y="100" width="12" height="50" />
                <rect x="16" y="150" width="12" height="50" />
                <rect x="22" y="200" width="12" height="50" />
                <rect x="18" y="250" width="12" height="50" />
                <rect x="20" y="300" width="12" height="50" />
                <rect x="17" y="350" width="12" height="50" />
                <rect x="19" y="400" width="12" height="50" />
                <rect x="18" y="450" width="12" height="50" />

                {/* Branches */}
                <rect x="4" y="120" width="15" height="10" />
                <rect x="28" y="220" width="15" height="10" />
              </g>
            </svg>
          </div>

          {/* Far left lightning bolt */}
          <div className="absolute left-[25%]" style={{ top: '28%' }}>
            <svg
              width="40"
              height="400"
              viewBox="0 0 40 400"
              className={cn(
                "transition-opacity duration-200 delay-75",
                phase === 'lightning' ? 'opacity-80' : 'opacity-0'
              )}
            >
              <g fill="#FFD700" stroke="#FFA500" strokeWidth="2">
                <rect x="14" y="0" width="12" height="40" />
                <rect x="20" y="40" width="12" height="40" />
                <rect x="10" y="80" width="12" height="40" />
                <rect x="16" y="120" width="12" height="40" />
                <rect x="14" y="160" width="12" height="40" />
                <rect x="15" y="200" width="12" height="40" />
                <rect x="14" y="240" width="12" height="40" />
                <rect x="15" y="280" width="12" height="40" />
                <rect x="14" y="320" width="12" height="40" />
                <rect x="15" y="360" width="12" height="40" />
              </g>
            </svg>
          </div>

          {/* Far right lightning bolt */}
          <div className="absolute left-[75%]" style={{ top: '28%' }}>
            <svg
              width="40"
              height="400"
              viewBox="0 0 40 400"
              className={cn(
                "transition-opacity duration-200 delay-200",
                phase === 'lightning' ? 'opacity-80' : 'opacity-0'
              )}
            >
              <g fill="#FFD700" stroke="#FFA500" strokeWidth="2">
                <rect x="14" y="0" width="12" height="40" />
                <rect x="8" y="40" width="12" height="40" />
                <rect x="18" y="80" width="12" height="40" />
                <rect x="12" y="120" width="12" height="40" />
                <rect x="14" y="160" width="12" height="40" />
                <rect x="13" y="200" width="12" height="40" />
                <rect x="14" y="240" width="12" height="40" />
                <rect x="13" y="280" width="12" height="40" />
                <rect x="14" y="320" width="12" height="40" />
                <rect x="13" y="360" width="12" height="40" />
              </g>
            </svg>
          </div>
        </>
      )}

      {/* Sound effect text */}
      {phase === 'lightning' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-retro text-6xl text-yellow-400 animate-pulse drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">
          ⚡ ZAP! ⚡
        </div>
      )}
    </div>
  );
}
