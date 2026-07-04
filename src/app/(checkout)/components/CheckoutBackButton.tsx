"use client";
import React from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function CheckoutBackButton() {
  const router = useRouter();
  return (
    <button 
      onClick={() => router.back()} 
      className="flex items-center gap-2 text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors h-10 px-2 -ml-2 rounded-xl hover:bg-[var(--surface-alt)]"
    >
      <ChevronLeft className="h-5 w-5" />
      <span className="font-semibold text-sm hidden sm:block">Back</span>
    </button>
  );
}
