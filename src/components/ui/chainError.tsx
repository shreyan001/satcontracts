'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Button } from './button';
import { useState } from 'react';

interface ChainErrorProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ChainError({ error, onRetry, onDismiss, className = '' }: ChainErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
      } catch (e) {
        console.error('Retry failed:', e);
      } finally {
        setIsRetrying(false);
      }
    }
  };

  return (
    <div className={`relative p-4 border border-red-200 bg-red-50 dark:bg-red-400/10 dark:border-red-400/30 rounded-lg ${className}`}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-400/20"
        >
          <X size={14} className="text-red-600 dark:text-red-400" />
        </button>
      )}
      
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
            Chain Connection Error
          </h4>
          <p className="text-sm text-red-700 dark:text-red-200 mb-3">
            {error}
          </p>
          {onRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-400 dark:text-red-300 dark:hover:bg-red-400/20"
            >
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChainError;
