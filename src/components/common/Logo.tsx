import React from 'react';

interface LogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'receipt';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
}) => {
  // Dimensions based on size
  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 48,
    xl: 64,
  };

  const currentIconSize = iconSizes[size];

  // SVG Icon: Bold Black & Orange geometric brand mark
  const BrandIcon = (
    <svg
      width={currentIconSize}
      height={currentIconSize}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id="sbOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff8c2b" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="sbDarkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1c1c22" />
          <stop offset="100%" stopColor="#0a0a0d" />
        </linearGradient>
        <filter id="sbGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f97316" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Outer rounded container with deep black background and subtle orange outline */}
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="14"
        fill="url(#sbDarkGrad)"
        stroke="#27272f"
        strokeWidth="2"
      />

      {/* Decorative top-right orange power notch */}
      <circle cx="50" cy="14" r="3.5" fill="#f97316" filter="url(#sbGlow)" />

      {/* Sleek stylized 'S' in vibrant orange */}
      <path
        d="M26 19 C18 19 16 23 16 26 C16 30 20 31.5 25 33 C31 34.5 33 36.5 33 40 C33 44 29 46 22 46 C18 46 15 44 14 42"
        stroke="url(#sbOrangeGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Sleek stylized 'B' / AI node path in pure crisp white */}
      <path
        d="M33 19 H41 C46 19 49 21.5 49 25.5 C49 28.5 47 30.5 43.5 31.5 C47.5 32.5 50 35 50 39.5 C50 44 46 46 41 46 H33 V19 Z"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />

      {/* Modern horizontal connector bar */}
      <rect x="25" y="31" width="16" height="3" rx="1.5" fill="#f97316" />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{BrandIcon}</div>;
  }

  if (variant === 'receipt') {
    return (
      <div className={`flex flex-col items-center justify-center text-center ${className}`}>
        <div className="flex items-center gap-2">
          {BrandIcon}
          <div className="text-left font-sans">
            <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>SmartBiz</span>
              <span className="bg-orange-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded">
                AI
              </span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-orange-400 font-medium">
              Universal POS & Billing
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {BrandIcon}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-extrabold text-white text-base tracking-tight font-sans">
            SmartBiz
          </span>
          <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded tracking-wide shadow-sm shadow-orange-500/30">
            AI
          </span>
        </div>
        {variant === 'full' && (
          <span className="text-[10px] font-medium tracking-wider text-zinc-400 uppercase mt-1">
            Universal Billing & Inventory
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
