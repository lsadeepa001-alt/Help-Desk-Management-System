import React from 'react';

export default function Card({
  children,
  className = '',
  glass = false,
  padded = true,
  hover = false,
  ...props
}) {
  const base = glass
    ? 'bg-slate-900/80 backdrop-blur-md border border-slate-700/70 shadow-xl'
    : 'bg-slate-850/90 border border-slate-800 shadow-md';
  const hoverClass = hover ? 'transition-all duration-200 hover:border-slate-700 hover:shadow-lg' : '';
  const paddingClass = padded ? 'p-6' : '';

  return (
    <div
      className={`rounded-2xl ${base} ${hoverClass} ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80 ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
