import React, { useState, useCallback } from 'react';
import { transcribeMedia, translateSubtitle } from '../services/ttsService';
import { Loader } from './Loader';
import { UploadIcon } from './icons/UploadIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import type { Language, LanguageCode } from '../types';
import { parseSubtitle } from '../services/subtitleParser';
import { toSrt, toAss, toTxt } from '../utils/subtitleFormatters';
import { adjustSubtitleTimings } from '../utils/timeUtils';

interface AudioAnalysisProps {
  languages: Language[];
}

type Task = 'transcribe' | 'translate';

export const AudioAnalysis: React.FC<AudioAnalysisProps> = ({ languages }) => {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [subtitleFileContent, setSubtitleFileContent] = useState<string>('');
  const [resultSrt, setResultSrt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Đang xử lý...');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  
  const [task, setTask] = useState<Task>('transcribe');
  const [sourceLang, setSourceLang] = useState<LanguageCode>('en-US');
  const [targetLang, setTargetLang] = useState<LanguageCode>('vi-VN');

  const resetState = () => {
    setResultSrt('');
    setError(null);
    setIsLoading(false);
  };

  const handleMediaFileSelect = useCallback((file: File) => {
    setMediaFile(file);
    setSubtitleFileContent('');
    setFileName(file.name);
    resetState();
  }, []);

  const handleSubtitleFileSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSubtitleFileContent(content);
      setMediaFile(null);
      setFileName(file.name);
      setTask('translate'); // Auto-switch to translate
      resetState();
    };
    reader.readAsText(file);
  }, []);

  const handleProcess = async () => {
    if (!mediaFile && !subtitleFileContent) {
      setError('Vui lòng chọn một tệp media hoặc phụ đề.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultSrt('');

    try {
      if (task === 'transcribe') {
        if (!mediaFile) throw new Error('Vui lòng chọn tệp media để tạo phụ đề.');
        const srtResult = await transcribeMedia(mediaFile, setLoadingMessage);
        setResultSrt(srtResult);
      } else if (task === 'translate') {
        let srtToTranslate = subtitleFileContent;
        if (mediaFile) {
          srtToTranslate = await transcribeMedia(mediaFile, setLoadingMessage);
        }
        if (!srtToTranslate) throw new Error('Không có nội dung phụ đề để dịch.');
        
        const sourceLangName = languages.find(l => l.code === sourceLang)?.name || sourceLang;
        const targetLangName = languages.find(l => l.code === targetLang)?.name || targetLang;
        const translatedSrt = await translateSubtitle(srtToTranslate, sourceLangName, targetLangName, setLoadingMessage);
        setResultSrt(translatedSrt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (format: 'srt' | 'ass' | 'txt') => {
    const contentToParse = resultSrt || subtitleFileContent;
    if (!contentToParse) return;
    try {
      const cues = parseSubtitle(contentToParse);
      // Always apply timing adjustments with a 1ms gap for better compatibility
      const { adjustedCues } = adjustSubtitleTimings(cues, 1);
      let content = '';
      
      if (format === 'srt') {
        content = toSrt(adjustedCues);
      } else if (format === 'ass') {
        content = toAss(adjustedCues);
      } else { // txt
        content = toTxt(adjustedCues); 
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const newFileName = fileName.replace(/\.[^/.]+$/, "") + `.${format}`;
      link.setAttribute('href', url);
      link.setAttribute('download', newFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error creating download file:", e);
      setError("Lỗi tạo tệp tải về.");
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.add('border-indigo-500');
  };

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.currentTarget.classList.remove('border-indigo-500');
  };

  const handleMediaDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-indigo-500');
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleMediaFileSelect(event.dataTransfer.files[0]);
    }
  };

  const handleSubtitleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-indigo-500');
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleSubtitleFileSelect(event.dataTransfer.files[0]);
    }
  };

  const isProcessingDisabled = isLoading || (!mediaFile && !subtitleFileContent);
  const contentToShow = resultSrt || subtitleFileContent;

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
        <h4 className="font-semibold text-gray-200 text-center">Chọn tác vụ</h4>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setTask('transcribe')}
            className={`p-3 rounded-md font-medium text-sm transition ${task === 'transcribe' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            Tạo phụ đề (Gỡ băng)
          </button>
          <button 
            onClick={() => setTask('translate')}
            className={`p-3 rounded-md font-medium text-sm transition ${task === 'translate' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            Dịch phụ đề
          </button>
        </div>
      </div>

      <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
        <h4 className="font-semibold text-gray-200 text-center">Tải lên tệp của bạn</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label 
                htmlFor="media-file-upload-tool" 
                className="flex flex-col items-center justify-center p-6 bg-gray-800/50 hover:bg-gray-800 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-lg cursor-pointer transition-colors"
                onDrop={handleMediaDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <UploadIcon className="w-8 h-8 text-gray-500 mb-2" />
                <span className="font-semibold text-gray-300">Tải lên Video/Âm thanh</span>
                <span className="text-xs text-gray-500">(.mp4, .mp3, .wav...)</span>
                <input id="media-file-upload-tool" type="file" className="sr-only" onChange={e => e.target.files && handleMediaFileSelect(e.target.files[0])} accept="audio/*,video/*" />
            </label>
            <label 
                htmlFor="subtitle-file-upload-tool" 
                className="flex flex-col items-center justify-center p-6 bg-gray-800/50 hover:bg-gray-800 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-lg cursor-pointer transition-colors"
                onDrop={handleSubtitleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <UploadIcon className="w-8 h-8 text-gray-500 mb-2" />
                <span className="font-semibold text-gray-300">Tải lên tệp phụ đề</span>
                <span className="text-xs text-gray-500">(.srt, .vtt)</span>
                <input id="subtitle-file-upload-tool" type="file" className="sr-only" onChange={e => e.target.files && handleSubtitleFileSelect(e.target.files[0])} accept=".srt,.vtt,.txt" />
            </label>
        </div>
        {fileName && (
          <div className="w-full text-center bg-gray-800 p-3 rounded-lg text-sm">
            <p className="text-gray-300"><span className="font-medium">Tệp đã chọn:</span> {fileName}</p>
          </div>
        )}
      </div>

      {task === 'translate' && (
        <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
          <h4 className="font-semibold text-gray-200 text-center">Chọn ngôn ngữ dịch</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="source-lang-select-tool" className="block text-sm font-medium text-gray-400 mb-1">Từ ngôn ngữ</label>
              <select
                id="source-lang-select-tool"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value as LanguageCode)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
              >
                {languages.map((lang) => (<option key={lang.code} value={lang.code}>{lang.name}</option>))}
              </select>
            </div>
            <div>
              <label htmlFor="target-lang-select-tool" className="block text-sm font-medium text-gray-400 mb-1">Sang ngôn ngữ</label>
              <select
                id="target-lang-select-tool"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500"
              >
                {languages.map((lang) => (<option key={lang.code} value={lang.code}>{lang.name}</option>))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={handleProcess}
          disabled={isProcessingDisabled}
          className="w-full md:w-auto flex items-center justify-center gap-3 px-12 py-4 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 rounded-full transition-all duration-200 transform hover:scale-105 disabled:bg-indigo-900/50 disabled:cursor-not-allowed disabled:scale-100 shadow-lg shadow-indigo-500/30"
        >
          {isLoading ? (
            <>
              <Loader />
              <span>{loadingMessage}</span>
            </>
          ) : (
            'Bắt đầu xử lý'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
          <p>{error}</p>
        </div>
      )}

      {contentToShow && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-200 text-center">Nội dung phụ đề</h4>
          <textarea
            value={contentToShow}
            readOnly
            className="w-full h-80 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-mono text-sm text-white"
          />
          <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
             <h4 className="font-semibold text-gray-200 text-center">Tải về phụ đề</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button onClick={() => handleDownload('srt')} className="w-full flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium transition-colors">
                      <DownloadIcon /> Tải về .SRT
                  </button>
                  <button onClick={() => handleDownload('ass')} className="w-full flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium transition-colors">
                      <DownloadIcon /> Tải về .ASS
                  </button>
                  <button onClick={() => handleDownload('txt')} className="w-full flex items-center justify-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md font-medium transition-colors">
                      <DownloadIcon /> Tải về .TXT
                  </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};
