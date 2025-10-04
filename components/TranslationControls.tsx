import React, { useState, useCallback } from 'react';
import type { Language, LanguageCode } from '../types';
import { translateText } from '../services/ttsService';
import { Loader } from './Loader';
import { TranslateIcon } from './icons/TranslateIcon';

interface TranslationControlsProps {
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  setSelectedLanguage: (targetLang: LanguageCode) => void;
  languages: Language[];
}

export const TranslationControls: React.FC<TranslationControlsProps> = ({
  text,
  setText,
  setSelectedLanguage,
  languages,
}) => {
  const [sourceLang, setSourceLang] = useState<LanguageCode>('en-US');
  const [targetLang, setTargetLang] = useState<LanguageCode>('vi-VN');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = useCallback(async () => {
    if (!text.trim()) {
      setError("Không có văn bản để dịch.");
      return;
    }
    if (sourceLang === targetLang) {
      setError("Ngôn ngữ gốc và ngôn ngữ đích phải khác nhau.");
      return;
    }
    
    setIsTranslating(true);
    setError(null);

    try {
      const sourceLangName = languages.find(l => l.code === sourceLang)?.name || sourceLang;
      const targetLangName = languages.find(l => l.code === targetLang)?.name || targetLang;
      
      const stream = await translateText(text, sourceLangName, targetLangName);
      if (stream) {
          setText(''); // Clear existing text
          for await (const chunk of stream) {
              setText(prev => prev + chunk.text);
          }
      }
      setSelectedLanguage(targetLang);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định.';
      setError(`Lỗi dịch: ${message}`);
    } finally {
      setIsTranslating(false);
    }
  }, [text, sourceLang, targetLang, languages, setText, setSelectedLanguage]);
  
  return (
    <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h4 className="font-semibold text-gray-200">Dịch văn bản</h4>
           <p className="text-xs text-gray-500">Dịch văn bản trước khi tạo giọng nói.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="source-lang-select" className="block text-sm font-medium text-gray-400 mb-1">Từ ngôn ngữ</label>
                <select
                id="source-lang-select"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value as LanguageCode)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
                </select>
            </div>
            <div>
                <label htmlFor="target-lang-select" className="block text-sm font-medium text-gray-400 mb-1">Sang ngôn ngữ</label>
                <select
                id="target-lang-select"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
                </select>
            </div>
        </div>
        <button
            onClick={handleTranslate}
            disabled={isTranslating || !text.trim()}
            className="w-full flex items-center justify-center gap-2 p-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-900/50 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
        >
            {isTranslating ? <Loader /> : <TranslateIcon />}
            {isTranslating ? 'Đang dịch...' : 'Dịch văn bản'}
        </button>
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
    </div>
  );
};
