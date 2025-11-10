"use client";

import { ReactNode } from "react";
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from "lucide-react";

interface AlertProps {
  children: ReactNode;
  variant?: "success" | "error" | "warning" | "info";
  title?: string;
  onClose?: () => void;
  className?: string;
}

export default function Alert({
  children,
  variant = "info",
  title,
  onClose,
  className = "",
}: AlertProps) {
  const variantStyles = {
    success: {
      container: "bg-success/10 border-success text-success",
      icon: CheckCircle,
      iconColor: "text-success",
    },
    error: {
      container: "bg-error/10 border-error text-error",
      icon: AlertCircle,
      iconColor: "text-error",
    },
    warning: {
      container: "bg-warning/10 border-warning text-warning",
      icon: AlertTriangle,
      iconColor: "text-warning",
    },
    info: {
      container: "bg-info/10 border-info text-info",
      icon: Info,
      iconColor: "text-info",
    },
  };

  const { container, icon: Icon, iconColor } = variantStyles[variant];

  return (
    <div
      className={`relative flex gap-3 p-4 rounded-lg border ${container} ${className}`}
      role="alert"
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-1">{title}</h4>}
        <div className="text-sm">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Close alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
