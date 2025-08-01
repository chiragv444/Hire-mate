import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  size = 'md', 
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl'
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "rounded-lg bg-gradient-to-br from-primary to-brand-accent flex items-center justify-center",
        sizeClasses[size]
      )}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-2/3 h-2/3 text-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
            fill="currentColor"
          />
          <path
            d="M19 15L19.5 17.5L22 18L19.5 18.5L19 21L18.5 18.5L16 18L18.5 17.5L19 15Z"
            fill="currentColor"
            opacity="0.7"
          />
          <path
            d="M5 3L5.5 5.5L8 6L5.5 6.5L5 9L4.5 6.5L2 6L4.5 5.5L5 3Z"
            fill="currentColor"
            opacity="0.5"
          />
        </svg>
      </div>
      {showText && (
        <span className={cn(
          "font-bold text-gradient",
          textSizeClasses[size]
        )}>
          Hire Mate
        </span>
      )}
    </div>
  );
};