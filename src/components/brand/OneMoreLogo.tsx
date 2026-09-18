import React from 'react';
import { cn } from '@/lib/utils';

export interface OneMoreLogoProps {
  className?: string;
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

export function OneMoreLogo({
  className,
  variant = 'full',
  size = 'md',
}: OneMoreLogoProps) {
  const sizeClasses = {
    sm: variant === 'icon' ? 'size-6' : 'h-6',
    md: variant === 'icon' ? 'size-8' : 'h-8',
    lg: variant === 'icon' ? 'size-10' : 'h-10',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 select-none font-sans tracking-tight',
        sizeClasses[size],
        className,
      )}
      role="img"
      aria-label="원모어 (OneMore)"
    >
      {/* OneMore Modern Emblem Symbol */}
      <svg
        className={cn(
          'shrink-0 transition-transform duration-200 hover:scale-105',
          variant === 'icon' ? 'size-full' : 'h-full aspect-square',
        )}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="om_grad_main" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="om_grad_dark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
        </defs>

        {/* Outer Rounded Container */}
        <rect width="40" height="40" rx="10" fill="url(#om_grad_dark)" />

        {/* Dynamic 'O' and '1' Symbolizing 'One More' Leap */}
        <circle cx="20" cy="20" r="12" stroke="url(#om_grad_main)" strokeWidth="3.5" strokeDasharray="50 20" strokeLinecap="round" />
        
        {/* The '1' Leap Pillar */}
        <path
          d="M17 21L20 18V26"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 26H24"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Plus / More Star Accent */}
        <circle cx="27" cy="13" r="2.5" fill="#38BDF8" />
      </svg>

      {/* Typography Wordmark (Only in 'full' variant) */}
      {variant === 'full' && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center gap-0.5">
            <span className="font-extrabold text-slate-900 tracking-tight text-lg">One</span>
            <span className="font-extrabold text-blue-600 tracking-tight text-lg">More</span>
            <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              원모어
            </span>
          </div>
          <span className="text-[9.5px] font-medium text-slate-500 tracking-wider mt-0.5">
            AI 시니어 프로젝트 매칭
          </span>
        </div>
      )}
    </div>
  );
}

export default OneMoreLogo;
