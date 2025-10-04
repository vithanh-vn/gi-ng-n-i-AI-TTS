import type { ParsedCue } from '../types';
export type { ParsedCue };

/**
 * Parses a subtitle file content (SRT format) into structured cues.
 * It handles index, timestamps, and multi-line text for each cue.
 * @param content The string content of the subtitle file.
 * @returns An array of ParsedCue objects.
 */
export function parseSubtitle(content: string): ParsedCue[] {
  const cues: ParsedCue[] = [];
  // Standardize line endings and split into blocks
  const blocks = content.replace(/\r\n/g, '\n').trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 2) continue;

    let indexLine = lines[0];
    let timeLine = lines[1];
    let textLines = lines.slice(2);

    // Handle cases where index is missing
    const timeMatchFirstLine = indexLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if(timeMatchFirstLine) {
        timeLine = indexLine;
        textLines = lines.slice(1);
        indexLine = (cues.length + 1).toString();
    }


    // Basic validation
    if (!/^\d+$/.test(indexLine.trim())) continue; // Invalid index
    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (!timeMatch) continue; // Invalid timestamp

    const index = parseInt(indexLine.trim(), 10);
    const startTime = timeMatch[1].replace('.', ',');
    const endTime = timeMatch[2].replace('.', ',');
    let text = textLines.join('\n').trim();
    
    let speaker: string | undefined = undefined;

    // Check for "SPEAKER_NAME: text" format.
    const speakerMatch = text.match(/^([a-z0-9\s_-]+):\s*(.*)/is);
    
    if (speakerMatch && speakerMatch[1]?.trim() && speakerMatch[2]?.trim()) {
      speaker = speakerMatch[1].trim();
      text = speakerMatch[2].trim();
    }

    cues.push({ index, startTime, endTime, text, speaker });
  }
  
  return cues;
}