'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  itemsPerPage?: number;
  totalItems?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  itemsPerPage = 50,
  totalItems = 0,
}: PaginationProps) {
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    const adjustedStart = Math.max(1, endPage - 4);
    return adjustedStart + i;
  });

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Info Text */}
      {totalItems > 0 && (
        <div className="text-sm text-gray-600">
          Showing <span className="font-medium text-gray-900">{startItem}</span> to{' '}
          <span className="font-medium text-gray-900">{endItem}</span> of{' '}
          <span className="font-medium text-gray-900">{totalItems}</span> items
        </div>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {/* Previous Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || isLoading}
          className="px-2"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* First Page Indicator */}
        {pages[0] !== 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white rounded transition"
            >
              1
            </button>
            {pages[0] > 2 && (
              <span className="px-2 py-1 text-gray-500">...</span>
            )}
          </>
        )}

        {/* Page Numbers */}
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={isLoading}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded transition',
              page === currentPage
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-white bg-white border border-gray-200'
            )}
          >
            {page}
          </button>
        ))}

        {/* Last Page Indicator */}
        {pages[pages.length - 1] !== totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && (
              <span className="px-2 py-1 text-gray-500">...</span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white rounded transition"
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || isLoading}
          className="px-2"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
