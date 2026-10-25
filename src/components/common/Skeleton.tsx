import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => {
  return (
    <div className="w-full divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, rIndex) => (
        <div key={rIndex} className="flex items-center gap-4 py-3.5 px-4">
          {Array.from({ length: columns }).map((_, cIndex) => (
            <div
              key={cIndex}
              className={`h-4 ${
                cIndex === 0
                  ? 'w-1/3'
                  : cIndex === columns - 1
                  ? 'w-16 ml-auto'
                  : 'w-1/6'
              }`}
            >
              <Skeleton className="w-full h-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
