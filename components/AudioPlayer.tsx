import React, { useState, useRef, useEffect } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';

interface AudioPlayerProps {
  src: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
      
      const setAudioData = () => {
        setDuration(audio.duration);
        setCurrentTime(audio.currentTime);
      };

      const setAudioTime = () => setCurrentTime(audio.currentTime);

      const handleEnded = () => setIsPlaying(false);

      audio.addEventListener('loadeddata', setAudioData);
      audio.addEventListener('timeupdate', setAudioTime);
      audio.addEventListener('ended', handleEnded);

      // Reset player on new source
      setIsPlaying(false);
      setPlaybackRate(1.0);

      return () => {
        audio.removeEventListener('loadeddata', setAudioData);
        audio.removeEventListener('timeupdate', setAudioTime);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [src]);

  useEffect(() => {
    if(audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Error playing audio:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaybackRate(parseFloat(e.target.value));
  };
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current && isFinite(duration) && duration > 0) {
        const newTime = (parseFloat(e.target.value) / 100) * duration;
        if (isFinite(newTime)) {
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-gray-900/70 p-4 rounded-lg flex flex-col gap-3 border border-gray-700">
      <audio ref={audioRef} src={src} preload="metadata"></audio>
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlayPause}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full transition duration-200 flex-shrink-0"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="flex-grow flex items-center gap-3">
          <span className="text-sm text-gray-400 w-10 text-center">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-indigo-500"
          />
          <span className="text-sm text-gray-400 w-10 text-center">{formatTime(duration)}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label htmlFor="speed-control" className="text-sm text-gray-400">Tốc độ:</label>
        <input
          id="speed-control"
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={playbackRate}
          onChange={handleSpeedChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-indigo-500"
        />
        <span className="text-sm font-mono text-cyan-400 w-12 text-center">{playbackRate.toFixed(1)}x</span>
      </div>
    </div>
  );
};