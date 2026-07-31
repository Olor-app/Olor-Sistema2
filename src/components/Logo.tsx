import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const OFFICIAL_LOGO_URL = 'https://i.ibb.co/zVS8RLjX/Logo-Olor-Luz-PNG-Oficial.png';

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
  const heightClass = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24'
  }[size];

  return (
    <div className={`flex items-center gap-3 shrink-0 ${className}`}>
      <div className="relative group">
        {/* Glow de fundo dourado para destacar a logo */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-amber-300/10 rounded-xl blur-sm group-hover:opacity-100 transition-opacity opacity-75" />
        <img
          src={OFFICIAL_LOGO_URL}
          alt="Logo Oficial Olor Luz"
          referrerPolicy="no-referrer"
          className={`relative ${heightClass} w-auto object-contain drop-shadow-[0_4px_12px_rgba(212,175,55,0.25)] transition-transform duration-300 hover:scale-105`}
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="font-cinzel text-xl font-extrabold tracking-widest bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(212,175,55,0.2)]">
            OLOR LUZ
          </span>
          <span className="text-[10px] font-mono tracking-[0.3em] text-amber-400/90 uppercase font-semibold">
            AROMAS & DESIGN
          </span>
        </div>
      )}
    </div>
  );
};

