import { forwardRef, type ReactNode } from "react";

interface ShareableCardProps {
  children: ReactNode;
  cardWidth?: number;
  cardHeight?: number;
  className?: string;
}

export const ShareableCard = forwardRef<HTMLDivElement, ShareableCardProps>(
  ({ children, cardWidth = 1080, cardHeight = 1080, className = "" }, ref) => {
    return (
      <div
        ref={ref}
        className={`shareable-card relative flex flex-col overflow-hidden ${className}`}
        style={{
          width: cardWidth,
          height: cardHeight,
          backgroundColor: "oklch(0.04 0.002 280)",
          color: "oklch(0.90 0.01 90)",
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
    );
  },
);

ShareableCard.displayName = "ShareableCard";
