import React from "react";
import { twMerge } from "tailwind-merge";

export function cn(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(" "));
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" }) {
  const { className, variant = "ghost", ...rest } = props;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-glow hover:brightness-110",
        variant === "outline" && "border border-line bg-panel2 text-ink hover:bg-slate-900",
        variant === "ghost" && "text-muted hover:bg-white/5 hover:text-ink",
        className
      )}
      {...rest}
    />
  );
}
