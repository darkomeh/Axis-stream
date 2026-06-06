import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logPlatformError } from '../services/firebaseService';

interface Props {
 children?: ReactNode;
}

interface State {
 hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
 public state: State = {
 hasError: false
 };

 public static getDerivedStateFromError(_: Error): State {
 return { hasError: true };
 }

 public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 console.error("Uncaught error:", error, errorInfo);
 logPlatformError(
 error.message,
 error.stack + '\n\nComponent Stack:\n' + errorInfo.componentStack,
 'React Error Boundary'
 );
 }

 public render() {
 if (this.state.hasError) {
 return (
 <div className="min-h-screen bg-transparent flex items-center justify-center p-6 text-center">
 <div className="max-w-md space-y-6">
 <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto border border-brand/20">
 <span className="text-fluid-4xl">⚠️</span>
 </div>
 <h1 className="text-fluid-3xl font-semibold tracking-tight text-white">Neural Link Severed</h1>
 <p className="text-gray-500 text-fluid-sm font-medium">
 We've encountered a platform exception. Our engineers have been notified and are already on the case.
 </p>
 <button 
 onClick={() => window.location.reload()}
 className="px-8 py-3 bg-brand text-white text-fluid-xs font-semibold tracking-wide rounded-full hover:shadow-[0_0_20px_rgba(229,9,20,0.4)] transition-all"
 >
 Reboot Matrix
 </button>
 </div>
 </div>
 );
 }

 return this.props.children;
 }
}
