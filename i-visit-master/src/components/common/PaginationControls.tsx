// src/components/common/PaginationControls.tsx
import React from "react";

type PaginationControlsProps = {
  page: number; // 0-based
  pageSize: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
};

export default function PaginationControls({
  page,
  pageSize,
  totalElements,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  disabled = false,
}: PaginationControlsProps) {
  const currentPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
  const canGoPrev = currentPage > 0 && !disabled;
  const canGoNext = currentPage < totalPages - 1 && !disabled;

  const startIndex = totalElements === 0 ? 0 : currentPage * pageSize + 1;
  const endIndex = Math.min((currentPage + 1) * pageSize, totalElements);

  const handlePrev = () => {
    if (!canGoPrev) return;
    onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    onPageChange(currentPage + 1);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    if (!onPageSizeChange) return;
    onPageSizeChange(newSize);
  };

  if (totalElements === 0 && totalPages === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 mt-4 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-slate-200">
      <div className="flex items-center gap-2">
        <span className="text-slate-400">
          Rows {startIndex.toLocaleString()}–{endIndex.toLocaleString()} of{" "}
          {totalElements.toLocaleString()}
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Rows per page:</span>
            <select
              className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
              value={pageSize}
              onChange={handlePageSizeChange}
              disabled={disabled}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 justify-end">
        <span className="text-slate-400">
          Page {totalPages === 0 ? 0 : currentPage + 1} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev}
            className={`px-2 py-1 rounded border text-xs ${
              canGoPrev
                ? "border-slate-600 text-slate-100 hover:bg-slate-700"
                : "border-slate-700 text-slate-500 cursor-not-allowed"
            }`}
          >
            Prev
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            className={`px-2 py-1 rounded border text-xs ${
              canGoNext
                ? "border-slate-600 text-slate-100 hover:bg-slate-700"
                : "border-slate-700 text-slate-500 cursor-not-allowed"
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
