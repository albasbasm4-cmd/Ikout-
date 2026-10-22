/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { clearSavedGameState } from '../utils/persist';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public handleResetAndReload = (): void => {
    clearSavedGameState();
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          dir="rtl"
          className="min-h-screen w-full bg-neutral-950 flex items-center justify-center p-4 text-amber-50 select-none"
        >
          <div className="w-full max-w-sm bg-neutral-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-lg font-black text-amber-300 mb-1">
              حدث خطأ غير متوقع
            </h2>
            <p className="text-xs text-amber-200/70 leading-relaxed mb-4">
              نعتذر عن هذا الخطأ. يمكنك إعادة المحاولة لاستئناف اللعب دون فقدان بياناتك.
            </p>

            {this.state.error && (
              <div className="w-full bg-black/60 border border-rose-500/30 rounded-xl p-2.5 mb-4 text-right">
                <span className="text-[10px] text-rose-300 font-mono block break-words">
                  {this.state.error.message}
                </span>
              </div>
            )}

            <div className="w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة المحاولة (Retry)</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-200 font-bold text-xs border border-neutral-700 active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>العودة للبداية وتحديث الصفحة</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
