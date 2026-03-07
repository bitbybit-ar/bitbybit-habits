import React from "react";
import { cn } from "@/lib/utils";
import styles from "./section.module.scss";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  alternate?: boolean;
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, alternate = false, children, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(styles.section, alternate && styles.alternate, className)}
        {...props}
      >
        <div className={styles.container}>{children}</div>
      </section>
    );
  },
);
Section.displayName = "Section";

export default Section;
