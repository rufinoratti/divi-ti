'use client';

import { type ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-bold text-[#1f1f1f]">
        {label}
      </label>
      {children}
    </div>
  );
}
