/**
 * Security Score Circular Component
 * Circular progress indicator for security score
 */

'use client';

import { cn } from '@/lib/utils';

interface SecurityScoreCircularProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function SecurityScoreCircular({
  score,
  size = 160,
  strokeWidth = 12,
  className,
}: SecurityScoreCircularProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const remaining = circumference - progress;

  // Determine color based on score
  const getColor = () => {
    if (score >= 80) return '#10b981'; // Success green
    if (score >= 60) return '#f59e0b'; // Warning orange
    return '#ef4444'; // Error red
  };

  const color = getColor();

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-slate-700"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${progress} ${remaining}`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>

        {/* Score text in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-slate-900 dark:text-white">{score}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">/ 100</span>
        </div>
      </div>

      {/* Status label */}
      <div className="mt-4 text-center">
        <p className="text-sm font-semibold" style={{ color }}>
          {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Improvement'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Security Posture</p>
      </div>
    </div>
  );
}
