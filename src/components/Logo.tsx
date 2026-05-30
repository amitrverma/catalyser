import React, { useState, useEffect } from 'react';

interface LogoProps {
  layout?: 'icon-only' | 'column' | 'row';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  onDark?: boolean;
  allowChange?: boolean;
}

export default function Logo({
  layout = 'column',
  size = 'md',
  showSubtitle = true,
  onDark = false,
  allowChange = true,
}: LogoProps) {
  // Store custom logo as Base64 image
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    // Read on initial load
    const stored = localStorage.getItem('custom_logo_base64');
    if (stored) {
      setCustomLogo(stored);
    }

    // Handlers for storage change and custom event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'custom_logo_base64') {
        setCustomLogo(e.newValue);
      }
    };

    const handleCustomChange = () => {
      setCustomLogo(localStorage.getItem('custom_logo_base64'));
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('custom-logo-updated', handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('custom-logo-updated', handleCustomChange);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        localStorage.setItem('custom_logo_base64', base64String);
        window.dispatchEvent(new Event('custom-logo-updated'));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem('custom_logo_base64');
    window.dispatchEvent(new Event('custom-logo-updated'));
  };

  // Dimensions based on size property
  const iconSizes = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  };

  const textSizes = {
    sm: 'text-base sm:text-lg',
    md: 'text-xl sm:text-2xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-4xl sm:text-5xl',
  };

  const renderIcon = () => {
    if (customLogo) {
      return (
        <div className={`relative group flex items-center justify-center ${iconSizes[size]} shrink-0`} id="catalyser-logo-icon">
          <img
            src={customLogo}
            alt="Catalyser Logo"
            className="w-full h-full object-contain object-center rounded-lg border border-slate-200/40 bg-white/5"
            referrerPolicy="no-referrer"
          />
          {allowChange && (
            <div className="absolute inset-0 bg-slate-900/75 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-[9px] text-white select-none print:hidden">
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 px-1.5 py-0.5 rounded font-bold uppercase text-[8px] tracking-wide">
                Update
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              <button 
                type="button" 
                onClick={handleResetLogo}
                className="hover:underline p-0.5 text-rose-300 border-none bg-transparent font-bold cursor-pointer uppercase text-[8px] tracking-wide"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`relative group flex items-center justify-center ${iconSizes[size]} shrink-0`} id="catalyser-logo-icon">
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Background square: light blue-gray with NO rounded corners */}
          <rect
            x="20"
            y="20"
            width="160"
            height="160"
            fill="#adb8be"
          />
          
          {/* The tilted blueprint/capsule container */}
          <g transform="rotate(-40 100 100)">
            {/* Cylinder outer boundary */}
            <rect
              x="50"
              y="74"
              width="100"
              height="52"
              rx="26"
              fill="none"
              stroke="#ffffff"
              strokeWidth="12"
            />
            
            {/* Top blue stripe */}
            <rect
              x="76"
              y="80"
              width="48"
              height="12"
              fill="#016fca"
            />

            {/* Middle light gray-blue stripe */}
            <rect
              x="76"
              y="92"
              width="48"
              height="16"
              fill="#a5b5bd"
            />

            {/* Bottom blue stripe */}
            <rect
              x="76"
              y="108"
              width="48"
              height="12"
              fill="#016fca"
            />

            {/* Bottom-left endcap: solid royal blue circle */}
            <circle
              cx="76"
              cy="100"
              r="20"
              fill="#016fca"
            />
          </g>
        </svg>
        {allowChange && (
          <div className="absolute inset-0 bg-slate-900/75 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white select-none print:hidden">
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-[8px] font-bold uppercase tracking-wide text-center">
              Upload Custom Logo
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        )}
      </div>
    );
  };

  if (layout === 'icon-only') {
    return renderIcon();
  }

  const renderText = (alignClass: 'items-start text-left' | 'items-center text-center') => (
    <div className={`flex flex-col ${alignClass} font-sans`}>
      <div className={`font-extrabold tracking-tight leading-none ${textSizes[size]} flex items-center select-none`}>
        <span style={{ color: '#016fca' }}>CATALY</span>
        <span style={{ color: '#435866' }}>S</span>
        <span style={{ color: '#016fca' }}>ER</span>
      </div>
      {showSubtitle && (
        <span 
          className="font-bold tracking-[0.45em] uppercase" 
          style={{ 
            color: '#8c9ea7', 
            fontSize: size === 'sm' ? '8px' : size === 'md' ? '11px' : size === 'lg' ? '16px' : '20px',
            marginTop: '3px',
            marginRight: '-0.45em' // compensate for tracking trailing spacing
          }}
        >
          DESIGN
        </span>
      )}
    </div>
  );

  if (layout === 'row') {
    return (
      <div className="flex items-center gap-3 py-1" id="catalyser-logo-row">
        {renderIcon()}
        {renderText('items-start text-left')}
      </div>
    );
  }

  // Column layout (Default)
  return (
    <div className="flex flex-col items-center justify-center text-center p-3" id="catalyser-logo-col">
      {renderIcon()}
      <div className="mt-4">
        {renderText('items-center text-center')}
      </div>
    </div>
  );
}
