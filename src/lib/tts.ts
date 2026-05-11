/**
 * Utility for browser-native Text-to-Speech
 */
export function speakChinese(text: string) {
  if (!window.speechSynthesis) {
    console.error("Browser does not support Speech Synthesis");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Filter text to only include Chinese characters and punctuation
  // \u4e00-\u9fa5 includes common Han characters
  // \u3000-\u303f includes CJK symbols and punctuation
  // \uff00-\uffef includes Halfwidth and Fullwidth Forms (more punctuation)
  const chineseOnlyText = text.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g)?.join('') || '';

  if (!chineseOnlyText) return;

  const utterance = new SpeechSynthesisUtterance(chineseOnlyText);
  
  // Attempt to find a Chinese voice
  const voices = window.speechSynthesis.getVoices();
  const chineseVoice = voices.find(v => v.lang.startsWith('zh-TW')) || 
                       voices.find(v => v.lang.startsWith('zh-CN')) ||
                       voices.find(v => v.lang.includes('zh'));
  
  if (chineseVoice) {
    utterance.voice = chineseVoice;
  }
  
  utterance.lang = 'zh-TW'; // Default to Traditional for TOCFL
  utterance.rate = 0.8;    // Slightly slower for better clarity
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
}
