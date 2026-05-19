import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, BookOpen, X, ChevronRight, Save } from 'lucide-react';
import { useReadingPassages } from '../../hooks/useReadingPassages';
import { ReadingPassage, ProficiencyLevel } from '../../types';
import { cn } from '../../lib/utils';

interface Props {
  onPractice: (passage: ReadingPassage) => void;
  onClose: () => void;
}

export function ReadingPassageManager({ onPractice, onClose }: Props) {
  const { passages, isLoaded, addPassage, removePassage } = useReadingPassages();
  const [isAdding, setIsAdding] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newLevel, setNewLevel] = useState<ProficiencyLevel>('當代1');
  const [newLesson, setNewLesson] = useState('');

  const handleAdd = async () => {
    if (!newTitle || !newContent) return;

    // Phân tách câu dựa trên dấu câu (。！？；) hoặc xuống dòng, giữ lại dấu câu
    const lines = newContent
      .replace(/([。！？；\n])/g, '$1\u0001')
      .split('\u0001')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(text => ({ text }));

    await addPassage({
      title: newTitle,
      lines,
      level: newLevel,
      lesson: newLesson,
      tags: []
    });

    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-slate-950/80">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <BookOpen size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-100">Quản lý Bài Khóa</h3>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg font-bold hover:bg-indigo-500 transition-all"
            >
              <Plus size={16} />
              <span>{isAdding ? 'Hủy' : 'Thêm bài khóa'}</span>
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {isAdding ? (
              <motion.div 
                key="add-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 max-w-2xl mx-auto"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Tiêu đề</label>
                    <input 
                      autoFocus
                      required
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-slate-100"
                      placeholder="Bài 1: Cuộc họp"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Cấp độ</label>
                    <select
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value as ProficiencyLevel)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-sm text-slate-100"
                    >
                      {['當代1', '當代2', '當代3', '當代4', '當代5', '當代6'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Nội dung bài khóa (Tự động tách câu theo dấu câu)</label>
                  <textarea 
                    required
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-slate-100 min-h-[300px] font-zh leading-loose"
                    placeholder="今天我很忙。&#10;你要去哪裡？&#10;我也要去商店。"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="px-6 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg font-bold hover:bg-slate-700 transition-all text-sm"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handleAdd}
                    disabled={!newTitle || !newContent}
                    className="flex items-center gap-2 px-8 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    <Save size={16} />
                    Lưu bài khóa
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {!isLoaded ? (
                  <div className="col-span-full py-20 text-center text-slate-500">Đang tải bài khóa...</div>
                ) : passages.length === 0 ? (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <p className="text-slate-500">Chưa có bài khóa nào.</p>
                    <button 
                      onClick={() => setIsAdding(true)}
                      className="px-4 py-2 border border-slate-800 rounded-lg text-indigo-400 hover:bg-slate-800 transition-all text-sm"
                    >
                      Tạo bài khóa đầu tiên
                    </button>
                  </div>
                ) : (
                  passages.map((passage) => (
                    <div 
                      key={passage.id}
                      className="p-6 bg-slate-800/40 border border-slate-800 rounded-2xl group hover:border-indigo-500/50 transition-all flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span className="text-[9px] px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-500 font-bold uppercase mb-2 inline-block">
                            {passage.level}
                          </span>
                          <h4 className="text-lg font-bold text-slate-100">{passage.title}</h4>
                          <p className="text-xs text-slate-500">{passage.lines.length} câu</p>
                        </div>
                        <button 
                          onClick={() => removePassage(passage.id)}
                          className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="mt-auto pt-6 flex gap-2">
                        <button 
                          onClick={() => onPractice(passage)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white text-xs rounded-lg font-bold hover:bg-indigo-500 transition-all"
                        >
                          Luyện tập
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
