import React, { useState, useEffect } from 'react';

interface FindAndReplaceProps {
  content: string;
  onContentChange: (newContent: string) => void;
}

export const FindAndReplace: React.FC<FindAndReplaceProps> = ({ content, onContentChange }) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCount, setMatchCount] = useState<number | null>(null);

  // Reset match count if the main content or find text changes
  useEffect(() => {
    setMatchCount(null);
  }, [content, findText]);

  const getFindRegex = (flags: string) => {
    // Escape special regex characters
    const escapedFindText = findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    return new RegExp(escapedFindText, flags);
  };

  const handleFind = () => {
    if (!findText) {
      setMatchCount(0);
      return;
    }
    const matches = content.match(getFindRegex('gi'));
    setMatchCount(matches ? matches.length : 0);
  };

  const handleReplace = () => {
    if (findText && matchCount !== null && matchCount > 0) {
      const newContent = content.replace(getFindRegex('i'), replaceText);
      onContentChange(newContent);
    }
  };

  const handleReplaceAll = () => {
    if (findText && matchCount !== null && matchCount > 0) {
      const newContent = content.replace(getFindRegex('gi'), replaceText);
      onContentChange(newContent);
    }
  };

  return (
    <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
      <h4 className="font-semibold text-gray-200">Tìm & Thay thế</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          value={findText}
          onChange={(e) => setFindText(e.target.value)}
          placeholder="Tìm văn bản..."
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="text"
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          placeholder="Thay thế bằng..."
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
        />
      </div>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
         <button
          onClick={handleFind}
          disabled={!findText}
          className="w-full p-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
        >
          Tìm
        </button>
        <button
          onClick={handleReplace}
          disabled={!findText || matchCount === null || matchCount === 0}
          className="w-full p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
        >
          Thay thế
        </button>
        <button
          onClick={handleReplaceAll}
          disabled={!findText || matchCount === null || matchCount === 0}
          className="w-full p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
        >
          Thay thế tất cả
        </button>
      </div>
      {matchCount !== null && (
        <p className="text-sm text-center text-gray-400">
          Đã tìm thấy {matchCount} kết quả.
        </p>
      )}
    </div>
  );
};
