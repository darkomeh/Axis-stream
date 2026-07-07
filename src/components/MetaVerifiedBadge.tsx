import React from "react";

interface MetaVerifiedBadgeProps {
  className?: string;
}

export function MetaVerifiedBadge({ className = "w-4 h-4" }: MetaVerifiedBadgeProps) {
  return (
    <svg 
      className={`shrink-0 select-none inline-block ${className}`} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Verified Badge"
    >
      {/* Precision Meta-inspired Scalloped Rosette Starburst */}
      <path 
        d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.937.1-1.353.257C14.775 2.515 13.515 1.7 12.1 1.7c-1.414 0-2.675.815-3.279 2.067-.416-.157-.873-.257-1.353-.257-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .937-.1 1.353-.257.604 1.252 1.865 2.067 3.279 2.067 1.414 0 2.675-.815 3.279-2.067.416 1.57.873.257 1.353.257 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z" 
        fill="#0095f6" 
      />
      {/* Crisp White Checkmark inside */}
      <path 
        d="M9.702 12.38l1.715 1.715L15.38 9.93" 
        stroke="white" 
        strokeWidth="2.3" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}
