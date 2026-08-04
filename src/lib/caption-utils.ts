export interface CaptionWord {
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
}

export interface CaptionSegment {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  words: CaptionWord[];
}

/**
 * Helper to identify and filter non-spoken noise or silence annotations like (Silence), [Music], (Laughter), etc.
 */
function isNoiseOrSilenceWord(word: string): boolean {
  if (!word || typeof word !== 'string') return true;
  const raw = word.trim();
  if (!raw) return true;

  // Check if entire word is enclosed in brackets or parentheses e.g. (Silence), [Music]
  if (/^[\(\[\{].*[\)\]\}]$/.test(raw)) return true;

  // Clean word of outer punctuation/brackets to check against noise list
  const clean = raw.toLowerCase().replace(/^[([{\s"']+|[)}\]\s"']+|[\.,!?:;]+/g, '');
  if (!clean) return true;

  const noiseTokens = ['silence', 'music', 'laughter', 'applause', 'sighs', 'sigh', 'coughing', 'inaudible', 'pause', 'noise', 'cheering', 'gasp', 'clears throat'];
  return noiseTokens.includes(clean);
}

/**
 * Segments raw transcript data or word items into clean, perfectly-timed caption segments
 * consisting of 2 to 6 words per caption segment.
 */
export function segmentTranscriptIntoCaptions(rawCaptions: unknown[]): CaptionSegment[] {
  console.log(`[CAPTION PIPELINE] Caption generation started - Processing ${rawCaptions?.length || 0} raw phrases`);

  if (!rawCaptions || !Array.isArray(rawCaptions) || rawCaptions.length === 0) {
    console.warn(`[CAPTION PIPELINE] Received empty or invalid raw captions.`);
    return [];
  }

  // 1. Flatten all phrases into an ordered list of words with accurate timestamps
  const allWords: CaptionWord[] = [];

  for (const item of rawCaptions) {
    if (!item || typeof item !== 'object') continue;
    const phrase = item as Record<string, unknown>;

    const phraseStart = typeof phrase.start === 'number' ? phrase.start : (typeof phrase.start_time === 'number' ? phrase.start_time : parseFloat(String(phrase.start || phrase.start_time || '0')) || 0);
    const phraseEnd = typeof phrase.end === 'number' ? phrase.end : (typeof phrase.end_time === 'number' ? phrase.end_time : parseFloat(String(phrase.end || phrase.end_time || '0')) || 0);

    // If phrase has detailed word-level timestamps from Gemini
    if (Array.isArray(phrase.words) && phrase.words.length > 0) {
      for (const w of phrase.words) {
        if (!w || !w.word) continue;
        const wStr = String(w.word).trim();
        if (isNoiseOrSilenceWord(wStr)) continue;

        const wStart = typeof w.start === 'number' ? w.start : (parseFloat(w.start) || phraseStart);
        const wEnd = typeof w.end === 'number' ? w.end : (parseFloat(w.end) || phraseEnd);
        allWords.push({
          word: wStr,
          start: Math.max(0, wStart),
          end: Math.max(wStart + 0.05, wEnd)
        });
      }
    } else if (phrase.text && typeof phrase.text === 'string') {
      // Split phrase text into words and compute proportional timestamps
      const wordsArr = phrase.text.trim().split(/\s+/).filter((w: string) => w.length > 0 && !isNoiseOrSilenceWord(w));
      if (wordsArr.length > 0) {
        const duration = Math.max(0.2, phraseEnd - phraseStart);
        const timePerWord = duration / wordsArr.length;

        wordsArr.forEach((wStr: string, i: number) => {
          const wStart = phraseStart + (i * timePerWord);
          const wEnd = phraseStart + ((i + 1) * timePerWord);
          allWords.push({
            word: wStr,
            start: Math.max(0, wStart),
            end: Math.max(wStart + 0.05, wEnd)
          });
        });
      }
    }
  }

  if (allWords.length === 0) {
    console.warn(`[CAPTION PIPELINE] No valid words extracted from transcript.`);
    return [];
  }

  console.log(`[CAPTION PIPELINE] Transcript received - Total ${allWords.length} individual words extracted`);

  // 2. Group words into natural 2 to 6 word segments
  const segments: CaptionSegment[] = [];
  let currentGroup: CaptionWord[] = [];

  const pushCurrentGroup = () => {
    if (currentGroup.length === 0) return;
    const segStart = currentGroup[0].start;
    const segEnd = currentGroup[currentGroup.length - 1].end;
    const segText = currentGroup.map(w => w.word).join(' ');

    segments.push({
      id: `cap_seg_${segments.length + 1}_${Date.now()}`,
      start: Number(segStart.toFixed(2)),
      end: Number(segEnd.toFixed(2)),
      text: segText,
      words: [...currentGroup]
    });

    currentGroup = [];
  };

  for (let i = 0; i < allWords.length; i++) {
    const word = allWords[i];
    const prevWord = currentGroup.length > 0 ? currentGroup[currentGroup.length - 1] : null;

    // Check if silence gap is > 0.6 seconds between words
    const isSilenceGap = prevWord ? (word.start - prevWord.end > 0.6) : false;

    // Check punctuation ending on previous word (. ? ! , ; :)
    const prevPunctuation = prevWord ? /[.?!,;:]$/.test(prevWord.word) : false;

    // Decide if we should start a new segment before adding current word
    if (currentGroup.length >= 6 || (currentGroup.length >= 2 && (isSilenceGap || prevPunctuation))) {
      pushCurrentGroup();
    }

    currentGroup.push(word);
  }

  // Push remaining words
  pushCurrentGroup();

  console.log(`[CAPTION PIPELINE] Caption segments created - ${segments.length} segments generated (2-6 words each)`);
  return segments;
}
