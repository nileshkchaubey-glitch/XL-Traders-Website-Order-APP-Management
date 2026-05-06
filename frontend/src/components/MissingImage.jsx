import React from "react";
import { ImageOff } from "lucide-react";

export default function MissingImage({ className = "", size = 28 }) {
  return (
    <div
      className={`missing-image-bg flex items-center justify-center text-[#EF4444] ${className}`}
      data-testid="missing-image-placeholder"
    >
      <ImageOff size={size} strokeWidth={1.5} />
    </div>
  );
}
