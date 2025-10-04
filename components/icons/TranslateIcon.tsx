import React from 'react';

export const TranslateIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" {...props}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
    <path d="m18 8-4 4-4-4" />
    <path d="m6 16 4-4 4 4" />
    <path d="M21 12h-2a4 4 0 0 0-4-4V6a4 4 0 0 0 4-4h2" />
    <path d="M3 12h2a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4H3" />
  </svg>
);
