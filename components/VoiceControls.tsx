import React, { useState, useMemo, useEffect } from 'react';
import type { Language, Voice, LanguageCode, VoiceProvider } from '../types';
import { SoundWaveIcon } from './icons/SoundWaveIcon';
import { Loader } from './Loader';
import { InfoIcon } from './icons/InfoIcon';

interface VoiceControlsProps {
  languages: Language[];
  selectedLanguage: LanguageCode;
  onLanguageChange: (code: LanguageCode) => void;
  voices: Voice[];
  selectedVoice: string;
  onVoiceChange: (id: string) => void;
  voiceProvider: VoiceProvider;
  onVoiceProviderChange: (provider: VoiceProvider) => void;
}

const sampleTexts: Record<LanguageCode, string> = {
    'vi-VN': 'Xin chào, đây là bản xem trước của giọng nói được chọn.',
    'en-US': 'Hello, this is a preview of the selected voice.',
    'ja-JP': 'こんにちは、これは選択された音声のプレビューです。',
    'ko-KR': '안녕하세요, 이것은 선택된 음성의 미리보기입니다。',
    'es-ES': 'Hola, esta es una vista previa de la voz seleccionada.',
    'fr-FR': 'Bonjour, ceci est un aperçu de la voix sélectionnée.',
    'de-DE': 'Hallo, dies ist eine Vorschau der ausgewählten Stimme.',
    'cmn-CN': '你好，这是所选声音的预览。',
    'ru-RU': 'Здравствуйте, это предварительный просмотр выбранного голоса.',
    'hi-IN': 'नमस्ते, यह चयनित आवाज़ का पूर्वावलोकन है।',
};

const EdgeRecommendationBanner: React.FC = () => (
    <div className="p-4 bg-cyan-900/30 border border-cyan-700/50 rounded-lg flex items-start gap-3 animate-fade-in">
        <div className="flex-shrink-0 pt-0.5">
            <InfoIcon className="w-5 h-5 text-cyan-300" />
        </div>
        <div>
            <h4 className="font-bold text-cyan-300">Mẹo cho Giọng nói Miễn phí</h4>
            <p className="text-sm text-cyan-400 mt-1">
                Trình duyệt <strong>Microsoft Edge</strong> trên Windows đôi khi cung cấp các giọng nói chất lượng cao như <strong className="font-semibold">Hoài My</strong> và <strong className="font-semibold">Nam Minh</strong> miễn phí. Tuy nhiên, việc này phụ thuộc vào phiên bản Windows và Edge của bạn. Nếu bạn không thấy chúng, Microsoft có thể chưa cung cấp chúng cho các trang web.
            </p>
        </div>
    </div>
);


export const VoiceControls: React.FC<VoiceControlsProps> = ({
  languages,
  selectedLanguage,
  onLanguageChange,
  voices,
  selectedVoice,
  onVoiceChange,
  voiceProvider,
  onVoiceProviderChange,
}) => {
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  useEffect(() => {
    if (voices.length > 0 && !voices.find(v => v.id === selectedVoice)) {
        onVoiceChange(voices[0].id);
    } else if (voices.length === 0 && selectedVoice) {
        onVoiceChange('');
    }
  }, [voices, selectedVoice, onVoiceChange]);

  const handlePreviewVoice = () => {
    // API-based previews are not supported in this simple component.
    if (voiceProvider !== 'browser') {
      alert("Tính năng nghe thử cho giọng nói API sẽ sớm được cập nhật. Hiện tại, vui lòng sử dụng nút 'Phát giọng nói' chính.");
      return;
    }

    if (!selectedVoice || typeof window.speechSynthesis === 'undefined') {
      console.error("Speech Synthesis not supported.");
      return;
    }

    setIsPreviewLoading(true);

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    const sampleText = sampleTexts[selectedLanguage] || sampleTexts['en-US'];
    const utterance = new SpeechSynthesisUtterance(sampleText);
    
    // Find the browser voice by its URI (which we use as ID)
    const browserVoices = window.speechSynthesis.getVoices();
    const matchingBrowserVoice = browserVoices.find(v => v.voiceURI === selectedVoice);
    
    if (matchingBrowserVoice) {
      utterance.voice = matchingBrowserVoice;
    }
    utterance.lang = selectedLanguage;

    utterance.onend = () => {
      setIsPreviewLoading(false);
    };

    utterance.onerror = (event) => {
      console.error("Speech Synthesis Error", event);
      setIsPreviewLoading(false);
    };

    window.speechSynthesis.speak(utterance);
  };


  return (
    <div className="p-4 bg-gray-900/50 rounded-lg space-y-4">
      {selectedLanguage === 'vi-VN' && <EdgeRecommendationBanner />}
      {selectedLanguage === 'vi-VN' && (
        <div className="mb-4">
          <label htmlFor="provider-select" className="block text-sm font-medium text-gray-300 mb-2">Nguồn giọng nói</label>
          <select
              id="provider-select"
              value={voiceProvider}
              onChange={(e) => onVoiceProviderChange(e.target.value as VoiceProvider)}
              className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 transition duration-200"
          >
              <option value="browser">Trình duyệt (Miễn phí - Tốt nhất trên Edge)</option>
              <option value="microsoft">Microsoft Azure (Chất lượng cao, cần API Key)</option>
              <option value="google">Google Cloud (Chất lượng cao, cần API Key)</option>
              <option value="fpt">FPT.AI (Chất lượng cao, cần API Key)</option>
          </select>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="language-select" className="block text-sm font-medium text-gray-300 mb-2">Ngôn ngữ</label>
          <select
            id="language-select"
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
            className="w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="voice-select" className="block text-sm font-medium text-gray-300 mb-2">Giọng đọc</label>
          <div className="flex gap-2">
            <select
              id="voice-select"
              value={selectedVoice}
              onChange={(e) => onVoiceChange(e.target.value)}
              disabled={voices.length === 0}
              className="flex-grow w-full p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 disabled:opacity-50"
            >
              {voices.length > 0 ? (
                voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name}
                  </option>
                ))
              ) : (
                <option>Không có giọng đọc cho ngôn ngữ này</option>
              )}
            </select>
            <button
              onClick={handlePreviewVoice}
              disabled={!selectedVoice || isPreviewLoading || voiceProvider !== 'browser'}
              title={voiceProvider !== 'browser' ? "Tính năng này không khả dụng cho giọng nói API" : "Nghe thử giọng"}
              className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center transition disabled:opacity-50"
              aria-label="Nghe thử giọng"
            >
              {isPreviewLoading ? <Loader /> : <SoundWaveIcon />}
            </button>
          </div>
          {voices.length === 0 && selectedLanguage === 'vi-VN' && voiceProvider === 'browser' ? (
            <div className="mt-2 flex items-start gap-2 text-xs text-yellow-400 p-2 bg-yellow-900/20 rounded-md border border-yellow-800/50">
              <InfoIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Không tìm thấy giọng Tiếng Việt miễn phí?</strong><br />
                Giọng đọc miễn phí phụ thuộc vào trình duyệt và hệ điều hành của bạn. Hầu hết các trình duyệt phổ biến không có sẵn giọng Tiếng Việt.<br/>
                <strong>Giải pháp tốt nhất (Miễn phí):</strong><br/>
                Hãy thử sử dụng trình duyệt <strong>Microsoft Edge</strong> trên Windows. Đôi khi, nó cung cấp giọng "Hoai My" và "Nam Minh" chất lượng cao miễn phí. Nếu vẫn không có, bạn có thể cần cập nhật Windows/Edge hoặc thử giải pháp API.<br />
                <strong>Giải pháp chất lượng cao (Mọi trình duyệt):</strong><br/>
                Chọn nguồn <strong>Microsoft Azure</strong>, <strong>Google Cloud</strong> hoặc <strong>FPT.AI</strong> và thêm API Key của bạn trong tab "Công cụ AI".
              </span>
            </div>
          ) : (
             <p className="text-xs text-gray-500 mt-2">
              {voiceProvider === 'browser' ? 'Giọng đọc được cung cấp bởi trình duyệt của bạn.' : `Giọng đọc được cung cấp bởi dịch vụ API trả phí.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
