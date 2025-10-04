import React from 'react';

export const WaveformIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" {...props}>
    <path d="M3 10v4" />
    <path d="M6 8v8" />
    <path d="M9 6v12" />
    <path d="M12 4v16" />
    <path d="M15 6v12" />
    <path d="M18 8v8" />
    <path d="M21 10v4" />
  </svg>
);
