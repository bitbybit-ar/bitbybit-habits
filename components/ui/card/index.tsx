import React from "react";
import { cn } from "@/lib/utils";
import styles from "./card.module.scss";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hover" | "highlight";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(styles.card, styles[`variant-${variant}`], className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";

export default Card;
