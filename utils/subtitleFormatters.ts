import type { ParsedCue } from '../types';

/**
 * Converts an array of parsed cues back into an SRT formatted string.
 * @param cues Array of ParsedCue objects.
 * @returns A string in SRT format.
 */
export function toSrt(cues: ParsedCue[]): string {
  return cues
    .map(cue => {
      let text = cue.text;
      if (cue.speaker) {
        text = `${cue.speaker}: ${text}`;
      }
      return `${cue.index}\n${cue.startTime} --> ${cue.endTime}\n${text}`;
    })
    .join('\n\n');
}

/**
 * Converts SRT timestamp format (00:00:01,234) to ASS format (0:00:01.23).
 * @param srtTime The timestamp string from an SRT file.
 * @returns A timestamp string formatted for an ASS file.
 */
function srtTimeToAss(srtTime: string): string {
    const [hms, ms] = srtTime.split(',');
    const [h, m, s] = hms.split(':');
    const centiseconds = ms.slice(0, 2);
    return `${parseInt(h, 10)}:${m}:${s}.${centiseconds}`;
}


/**
 * Converts an array of parsed cues into an ASS formatted string.
 * @param cues Array of ParsedCue objects.
 * @returns A string in ASS format.
 */
export function toAss(cues: ParsedCue[]): string {
    const header = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

    const events = cues.map(cue => {
        const start = srtTimeToAss(cue.startTime);
        const end = srtTimeToAss(cue.endTime);
        const speaker = cue.speaker || '';
        // ASS format uses {\n} for newlines
        const text = cue.text.replace(/\n/g, '\\N');
        return `Dialogue: 0,${start},${end},Default,${speaker},0,0,0,,${text}`;
    }).join('\n');

    return `${header}\n${events}`;
}

/**
 * Converts an array of parsed cues into a plain text string.
 * @param cues Array of ParsedCue objects.
 * @returns A plain text string containing only the dialogue.
 */
export function toTxt(cues: ParsedCue[]): string {
  return cues.map(cue => {
      let line = cue.text;
      if (cue.speaker) {
        line = `${cue.speaker}: ${line}`;
      }
      return line;
    }).join('\n');
}

/**
 * Converts an array of parsed cues into a formatted script for voice-over.
 * @param cues Array of ParsedCue objects.
 * @param fileName The name of the original file.
 * @returns A formatted script as a string.
 */
export function toTxtScript(cues: ParsedCue[], fileName: string): string {
  const header = `KỊCH BẢN LỒNG TIẾNG\n\n` +
                 `Tệp gốc: ${fileName}\n` +
                 `Tổng số dòng: ${cues.length}\n` +
                 `===================================\n\n`;

  const scriptBody = cues.map(cue => {
    const speakerLine = cue.speaker ? `Người nói: ${cue.speaker}` : `Người nói: (Mặc định)`;
    return `[Dòng ${cue.index}]\n` +
           `Thời gian: ${cue.startTime} --> ${cue.endTime}\n` +
           `${speakerLine}\n` +
           `Nội dung: ${cue.text.replace(/\n/g, ' ')}\n`; // Flatten newlines in text for script readability
  }).join('\n');

  return header + scriptBody;
}