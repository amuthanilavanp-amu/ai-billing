import React, { useState } from 'react';

interface LogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'receipt';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  logoUrl?: string | null;
  companyName?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  logoUrl,
  companyName,
}) => {
  const [imageError, setImageError] = useState(false);

  // Dimensions based on size
  const iconSizes = {
    sm: 28,
    md: 38,
    lg: 50,
    xl: 68,
  };

  const currentIconSize = iconSizes[size];

  // The Cronus official software logo badge
  const CronusBrandIcon = (
    <div
      style={{ width: currentIconSize, height: currentIconSize }}
      className="rounded-full overflow-hidden shadow-md shadow-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center bg-[#090a0f] flex-shrink-0"
    >
      <img
        src="/cronus-logo.png"
        alt="The Cronus Billing Software"
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  );

  // If a custom logo image (e.g. store logo) is provided
  const DisplayIcon =
    logoUrl && !imageError ? (
      <div
        style={{ width: currentIconSize, height: currentIconSize }}
        className="rounded-xl overflow-hidden bg-black/40 border border-[#2e2e3a] flex items-center justify-center p-0.5 flex-shrink-0"
      >
        <img
          src={logoUrl}
          alt={companyName || 'Business Logo'}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain rounded-lg"
        />
      </div>
    ) : (
      CronusBrandIcon
    );

  // For receipts / customer bills:
  // Strictly display USER's shop logo if provided. Never display software brand logo on the customer's bill!
  if (variant === 'receipt') {
    if (logoUrl && !imageError) {
      return (
        <div className={`flex flex-col items-center justify-center text-center ${className}`}>
          <div className="mb-2 max-w-[140px] max-h-[70px] flex items-center justify-center">
            <img
              src={logoUrl}
              alt={companyName || 'Store Logo'}
              onError={() => setImageError(true)}
              className="max-h-14 max-w-[140px] object-contain rounded"
            />
          </div>
        </div>
      );
    }
    // If no custom shop logo is provided, do NOT render our software logo in the bill!
    return null;
  }

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{DisplayIcon}</div>;
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        {DisplayIcon}
        <div className="flex flex-col">
          <span className="font-extrabold text-white text-sm tracking-tight font-serif">
            {companyName || 'The Cronus'}
          </span>
          <span className="text-[9px] font-semibold tracking-wider text-amber-400 uppercase">
            Billing
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {DisplayIcon}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-black text-white text-base tracking-tight font-serif uppercase">
            {companyName || 'The Cronus'}
          </span>
          <span className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black font-black text-[9px] px-1.5 py-0.5 rounded tracking-wider shadow-sm shadow-amber-500/30 uppercase">
            Billing
          </span>
        </div>
        <span className="text-[10px] font-semibold tracking-wider text-amber-400/90 uppercase mt-1">
          Billing Software
        </span>
      </div>
    </div>
  );
};

export default Logo;
