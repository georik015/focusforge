import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal, ChevronRight } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    console.error('OPERATIONAL_FAULT_DETECTED:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-2xl w-full space-y-4">
            {/* Industrial Header */}
            <div className="bg-red-600 text-white p-4 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} />
                <h1 className="text-sm font-black uppercase tracking-[0.2em]">System_Fault: Rendering_Failure</h1>
              </div>
              <span className="text-[10px] font-black opacity-50 font-mono">CODE: CORE_DUMP_ERR</span>
            </div>

            {/* Error Content */}
            <div className="bg-white border-x border-b border-slate-200 p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <Terminal size={20} />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1 italic">Diagnostic Statement</h2>
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">
                      The application encountered an unrecoverable rendering sequence logic error. This node has been safely locked to prevent data corruption.
                    </p>
                  </div>
                </div>

                {/* Stack Trace Preview */}
                <div className="bg-slate-900 p-6 font-mono text-[11px] text-red-400 overflow-auto max-h-[200px] border-l-4 border-red-600 custom-scrollbar">
                  <div className="text-slate-500 mb-2">{">>>"} UNCAUGHT_EXCEPTION_REPORT</div>
                  <div className="font-bold mb-1">{this.state.error?.toString()}</div>
                  <div className="opacity-60 whitespace-pre text-[9px]">
                    {this.state.errorInfo?.componentStack || 'No component trace available'}
                  </div>
                </div>
              </div>

              {/* Action Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <button
                  onClick={this.handleReset}
                  className="bg-retail-dark text-white h-12 flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw size={14} className="animate-spin-slow" />
                  Attempt_Node_Reboot
                </button>
                <a
                  href="mailto:support@vanguard.com"
                  className="border border-retail-border h-12 flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors text-slate-900"
                >
                  Contact_System_Ops
                  <ChevronRight size={14} />
                </a>
              </div>
            </div>

            {/* Footer Status */}
            <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-tighter">
              <span>Node_Status: LOCKED</span>
              <span>Telemetry: ACTIVE</span>
              <span>Recovery_Mode: ENABLED</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
