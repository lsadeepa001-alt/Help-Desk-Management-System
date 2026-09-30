import React from 'react';

export default function PageHeader({
  title,
  description,
  tag,
  actions,
  className = '',
}) {
  return (
    <div
      className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 shadow-lg relative overflow-hidden mb-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="max-w-2xl space-y-1.5">
          {tag && (
            <span className="inline-block px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-md text-[11px] font-semibold tracking-wide uppercase">
              {tag}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{title}</h1>
          {description && (
            <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
