import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getLevelColor = (level: string, variant: 'badge' | 'solid' | 'text' = 'badge') => {
  const colors: Record<string, { badge: string; solid: string; text: string }> = {
    'A1': { badge: 'text-blue-400 bg-blue-400/10 border-blue-400/20', solid: 'bg-blue-600 border-blue-500', text: 'text-blue-400' },
    'A2': { badge: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', solid: 'bg-cyan-600 border-cyan-500', text: 'text-cyan-400' },
    'B1': { badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', solid: 'bg-emerald-600 border-emerald-500', text: 'text-emerald-400' },
    'B2': { badge: 'text-green-400 bg-green-400/10 border-green-400/20', solid: 'bg-green-600 border-green-500', text: 'text-green-400' },
    'C1': { badge: 'text-orange-400 bg-orange-400/10 border-orange-400/20', solid: 'bg-orange-600 border-orange-500', text: 'text-orange-400' },
    'C2': { badge: 'text-red-400 bg-red-400/10 border-red-500/20', solid: 'bg-red-600 border-red-500', text: 'text-red-400' },
    'All': { badge: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20', solid: 'bg-indigo-600 border-indigo-500', text: 'text-indigo-400' }
  };
  return colors[level]?.[variant] || colors['All'][variant];
};
