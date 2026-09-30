import React from 'react';

export default function LoadingState({
  message = 'Loading...',
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center text-slate-400 ${className}`}>
      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-300">{message}</p>
    </div>
  );
}
