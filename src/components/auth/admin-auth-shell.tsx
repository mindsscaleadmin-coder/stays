"use client";

import { Shield } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/routing";

interface AdminAuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AdminAuthShell({ title, subtitle, children, footer }: AdminAuthShellProps) {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 to-gray-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="text-start">
              <div className="text-slate-900 font-bold font-display">Greenfield</div>
              <div className="text-slate-500 text-[10px] tracking-wide uppercase">Admin Portal</div>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 font-display">{title}</h1>
          <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">{children}</div>

        {footer && <div className="text-center mt-6 text-sm text-gray-500">{footer}</div>}
      </div>
    </div>
  );
}

function AdminAuthInput({
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
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
        {...props}
      />
    </div>
  );
}

export { AdminAuthInput };
