import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Music, Trash2, Play, Pause, X, FileAudio, Plus, Loader2, Gauge, FastForward, Rewind } from 'lucide-react';
import { useAudioLessons } from '../../hooks/useAudioLessons';
import { getAudioFile } from '../../services/audioStorage';
import { cn } from '../../lib/utils';

interface AudioManagerProps {
  onClose: () => void;
}

export default function AudioManager({ onClose }: AudioManagerProps) {
  const { lessons, addLesson, removeLesson } = useAudioLessons();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  const playNext = async () => {
    if (!currentPlayingId) return;
    const currentIndex = lessons.findIndex(l => l.id === currentPlayingId);
    if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
      const nextLesson = lessons[currentIndex + 1];
      await playAudio(nextLesson.id);
    } else {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setCurrentPlayingId(null);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, audioUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const formatTimeDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // On some iOS versions, file.name might be empty or generic
      let title = file.name ? file.name.replace(/\.[^/.]+$/, "") : "Bài giảng mới";
      if (!uploadTitle) setUploadTitle(title);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadTitle) return;

    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await addLesson(uploadTitle, selectedFile, uploadDesc);
      setUploadTitle('');
      setUploadDesc('');
      setSelectedFile(null);
      setIsUploading(false);
    } catch (error) {
      console.error("Upload failed", error);
      setErrorMessage("Không thể lưu file. Có thể bộ nhớ trình duyệt đã đầy hoặc định dạng file không được hỗ trợ.");
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = async (id: string) => {
    if (currentPlayingId === id) {
      if (audioRef.current?.paused) {
        audioRef.current.play();
      } else {
        audioRef.current?.pause();
      }
      return;
    }

    const blob = await getAudioFile(id);
    if (blob) {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setCurrentPlayingId(id);
      
      // We need to wait for the state update or use an effect
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-linear-to-br from-indigo-600 to-fuchsia-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Music size={24} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white">Kho bài giảng âm thanh</h2>
              <p className="text-xs text-slate-400">Nghe và học từ các giáo trình yêu thích của bạn</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar">
          {isUploading ? (
            <motion.form 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleUpload}
              className="space-y-6 max-w-xl mx-auto py-8"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tên bài giảng</label>
                  <input 
                    required
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Ví dụ: Bài 1 - Chào hỏi"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Mô tả (tùy chọn)</label>
                  <textarea 
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    placeholder="Nhập ghi chú về bài giảng này..."
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all h-24"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Chọn file âm thanh</label>
                  <div className="relative group">
                    <input 
                      required
                      type="file"
                      accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/5 transition-all">
                      <div className="p-4 bg-slate-800 rounded-full text-slate-400 group-hover:text-indigo-400">
                        <Upload size={32} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-200">
                          {selectedFile ? selectedFile.name : "Nhấn hoặc kéo thả file vào đây"}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Hỗ trợ MP3, WAV, M4A...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsUploading(false)}
                  className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  disabled={isProcessing}
                  type="submit"
                  className="flex-3 py-4 bg-linear-to-r from-indigo-600 to-fuchsia-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                  Thêm vào kho
                </button>
              </div>
            </motion.form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Danh sách bài giảng ({lessons.length})</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsAutoPlay(!isAutoPlay)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                      isAutoPlay 
                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" 
                        : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400"
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full", isAutoPlay ? "bg-indigo-400 animate-pulse" : "bg-slate-600")} />
                    Auto-play Next
                  </button>
                  <button 
                    onClick={() => setIsUploading(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <Plus size={16} /> Nhập bài mới
                  </button>
                </div>
              </div>

              {lessons.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                  <div className="p-6 bg-slate-800 rounded-full mb-4">
                    <Music size={48} />
                  </div>
                  <h4 className="text-xl font-bold mb-2">Chưa có bài giảng nào</h4>
                  <p className="text-sm max-w-xs leading-relaxed">Hãy nhập các file âm thanh từ giáo trình của bạn để bắt đầu luyện nghe mọi lúc.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lessons.map((lesson) => (
                    <motion.div 
                      layout
                      key={lesson.id}
                      className={cn(
                        "p-5 bg-slate-950 border rounded-2xl flex flex-col transition-all group relative overflow-hidden",
                        currentPlayingId === lesson.id 
                          ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_20px_rgba(99,102,241,0.1)] ring-1 ring-indigo-500/30" 
                          : "border-slate-800 hover:border-slate-700"
                      )}
                    >
                      {currentPlayingId === lesson.id && (
                        <div className="absolute top-0 right-0 p-3 flex gap-0.5 items-end h-12">
                          {[0, 1, 2, 3].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ 
                                height: !audioRef.current?.paused ? [4, 16, 8, 12, 6] : 4 
                              }}
                              transition={{ 
                                duration: 0.8, 
                                repeat: Infinity, 
                                ease: "easeInOut",
                                delay: i * 0.1
                              }}
                              className="w-1 bg-indigo-500 rounded-full"
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            currentPlayingId === lesson.id 
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-110" 
                              : "bg-slate-900 text-slate-500"
                          )}>
                            {currentPlayingId === lesson.id && !audioRef.current?.paused ? (
                              <Music size={20} className="animate-pulse" />
                            ) : (
                              <FileAudio size={20} />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1">{lesson.title}</h4>
                            <p className="text-[10px] text-slate-500 font-mono">{formatSize(lesson.fileSize)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeLesson(lesson.id)}
                          className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {lesson.description && (
                        <p className="text-xs text-slate-400 mb-4 line-clamp-2 italic">{lesson.description}</p>
                      )}

                      <div className="mt-auto pt-4 flex items-center gap-4">
                        <button 
                          onClick={() => playAudio(lesson.id)}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all",
                            currentPlayingId === lesson.id && !audioRef.current?.paused
                              ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/20"
                              : "bg-slate-800 text-indigo-400 hover:bg-slate-700"
                          )}
                        >
                          {currentPlayingId === lesson.id && !audioRef.current?.paused ? (
                            <><Pause size={16} /> Đang phát</>
                          ) : (
                            <><Play size={16} /> Nghe bài giảng</>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Audio Player Bar */}
        <AnimatePresence>
          {audioUrl && (
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-slate-950 border-t border-indigo-500/20 p-4 md:p-6"
            >
              <div className="max-w-3xl mx-auto space-y-4">
                {/* Custom Progress Bar */}
                <div className="space-y-1">
                  <input 
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>{formatTimeDisplay(currentTime)}</span>
                    <span>{formatTimeDisplay(duration)}</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  {/* Playback Controls */}
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => skip(-10)}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                      title="Lùi 10 giây"
                    >
                      <Rewind size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        if (audioRef.current?.paused) audioRef.current.play();
                        else audioRef.current?.pause();
                      }}
                      className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                    >
                      {audioRef.current?.paused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                    </button>
                    <button 
                      onClick={() => skip(10)}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                      title="Tiến 10 giây"
                    >
                      <FastForward size={20} />
                    </button>
                  </div>

                  {/* Speed Controls */}
                  <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                    <div className="px-3 text-slate-500">
                      <Gauge size={16} />
                    </div>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setPlaybackRate(rate)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-black transition-all",
                          playbackRate === rate 
                            ? "bg-indigo-600 text-white" 
                            : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => {
                      URL.revokeObjectURL(audioUrl);
                      setAudioUrl(null);
                      setCurrentPlayingId(null);
                    }}
                    className="p-2 text-slate-500 hover:text-red-400"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <audio 
                ref={audioRef}
                src={audioUrl}
                autoPlay
                className="hidden"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setCurrentPlayingId(currentPlayingId)}
                onPause={() => setCurrentPlayingId(prev => prev)}
                onEnded={() => {
                  if (isAutoPlay) {
                    playNext();
                  } else {
                    if (audioUrl) URL.revokeObjectURL(audioUrl);
                    setAudioUrl(null);
                    setCurrentPlayingId(null);
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
