import type { ParsedCue } from '../types';

/**
 * Converts an SRT timestamp (HH:MM:SS,ms) to seconds.
 * @param time SRT timestamp string.
 * @returns Time in seconds as a float.
 */
export function srtTimeToSeconds(time: string): number {
  const parts = time.split(/[:,]/);
  if (parts.length !== 4) return 0;
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  const milliseconds = parseInt(parts[3], 10);
  
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || isNaN(milliseconds)) {
    return 0;
  }
  
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

/**
 * Converts seconds to an SRT timestamp (HH:MM:SS,ms).
 * @param totalSeconds Time in seconds.
 * @returns SRT timestamp string.
 */
export function secondsToSrtTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return '00:00:00,000';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);

  const pad = (num: number, size = 2) => num.toString().padStart(size, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

/**
 * Validates and corrects subtitle cue timings to fix overlaps and invalid durations.
 * It also ensures a minimum gap between cues for compatibility with strict editors.
 * @param cues Array of ParsedCue objects.
 * @param minimumGapMs The minimum gap in milliseconds to enforce between cues.
 * @returns A new array of ParsedCue objects with corrected timings and the count of adjustments.
 */
export function adjustSubtitleTimings(cues: ParsedCue[], minimumGapMs: number = 1): { adjustedCues: ParsedCue[]; adjustmentsCount: number } {
  if (cues.length === 0) {
    return { adjustedCues: [], adjustmentsCount: 0 };
  }

  const adjustedCues: ParsedCue[] = [];
  let lastEndTime = 0; // Tracks the end time of the previous cue in seconds
  let adjustmentsCount = 0;
  const minimumGapSec = minimumGapMs / 1000;

  for (let i = 0; i < cues.length; i++) {
    const currentCue = { ...cues[i] };
    let wasAdjusted = false;
    
    let startTime = srtTimeToSeconds(currentCue.startTime);
    let endTime = srtTimeToSeconds(currentCue.endTime);
    let duration = endTime - startTime;

    // Ensure start time is not before the previous cue's end time + gap
    if (startTime < lastEndTime + minimumGapSec) {
      startTime = lastEndTime + minimumGapSec;
      wasAdjusted = true;
    }

    // Ensure end time is after start time. If original duration was invalid, create a default.
    if (duration <= 0) {
        duration = 2; // Default to a 2-second duration if original was invalid
        wasAdjusted = true;
    }
    
    endTime = startTime + duration;
    
    if (wasAdjusted) {
      adjustmentsCount++;
    }

    currentCue.startTime = secondsToSrtTime(startTime);
    currentCue.endTime = secondsToSrtTime(endTime);
    
    adjustedCues.push(currentCue);
    lastEndTime = endTime;
  }

  return { adjustedCues, adjustmentsCount };
}