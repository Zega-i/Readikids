import React from 'react';

type ButtonVariant = 'primary-comp' | 'secondary-comp' | 'kid-yellow' | 'kid-panel';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export default function Button({
  variant = 'primary-comp',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  let baseClass = 'inline-flex items-center justify-center font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ';

  if (variant === 'primary-comp') {
    baseClass += 'bg-comp-primary text-white rounded-comp px-6 min-h-[44px] hover:bg-opacity-90 shadow-comp ';
  } else if (variant === 'secondary-comp') {
    baseClass += 'bg-white text-comp-ink border-2 border-comp-border rounded-comp px-6 min-h-[44px] hover:bg-comp-bg ';
  } else if (variant === 'kid-yellow') {
    // Tombol kuning neon khas Kid Mode dengan teks hitam/ink
    baseClass += 'bg-neon-yellow text-comp-ink rounded-kid px-8 min-h-[56px] text-lg hover:brightness-110 drop-shadow-glow-yellow ';
  } else if (variant === 'kid-panel') {
    // Tombol gelap untuk aksi sekunder di mode anak
    baseClass += 'bg-space-panel text-text-bright border-2 border-space-line rounded-kid px-6 min-h-[56px] hover:border-text-bright ';
  }

  if (fullWidth) baseClass += 'w-full ';

  return (
    <button className={`${baseClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
