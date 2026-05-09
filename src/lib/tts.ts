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

  const utterance = new SpeechSynthesisUtterance(text);
  
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
