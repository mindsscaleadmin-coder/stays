"use client";

import { Home } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { ReactNode } from "react";

interface HostAuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function HostAuthShell({ title, subtitle, children, footer }: HostAuthShellProps) {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-green-50/80 to-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/host/login" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-green-700 rounded-xl flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div className="text-start">
              <div className="text-green-800 font-bold font-display">Greenfield</div>
              <div className="text-green-600 text-[10px] tracking-wide uppercase">Host Portal</div>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 font-display">{title}</h1>
          <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6">{children}</div>

        {footer && <div className="text-center mt-6 text-sm text-gray-500">{footer}</div>}
      </div>
    </div>
  );
}

function HostAuthInput({
  label,
  id,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        {...props}
      />
    </div>
  );
}

export { HostAuthInput };
