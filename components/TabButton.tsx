
import React from 'react';

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, children }) => {
  const activeClasses = 'border-indigo-500 text-indigo-400';
  const inactiveClasses = 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500';
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-4 px-6 border-b-2 font-medium text-sm transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
    >
      {children}
    </button>
  );
};
