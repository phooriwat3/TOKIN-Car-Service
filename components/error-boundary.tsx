"use client";

import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button, Card } from "@/components/ui";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary caught error]:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="my-6 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle size={24} />
          </div>
          <h3 className="font-display text-lg font-bold text-slate-800">
            Something went wrong
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {this.state.error?.message || "An unexpected UI error occurred."}
          </p>
          <div className="mt-5 flex justify-center">
            <Button type="button" onClick={this.handleReset}>
              <RefreshCw size={15} />
              Try again
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
