import type { ReactNode } from "react";

type FormFieldProps = {
  children: ReactNode;
  className?: string;
  label: string;
};

export function FormField({ children, className = "", label }: FormFieldProps) {
  return (
    <label className={`block space-y-1.5 text-sm font-medium ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
