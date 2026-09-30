import React from 'react';

const VARIANTS = {
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  error: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  info: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  neutral: 'bg-slate-700/40 text-slate-300 border-slate-700',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

const SIZES = {
  sm: 'text-[10px] px-2 py-0.5 font-medium',
  md: 'text-xs px-2.5 py-1 font-semibold',
};

export default function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
  icon: Icon,
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.neutral;
  const sizeClass = SIZES[size] || SIZES.sm;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${variantClass} ${sizeClass} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}
