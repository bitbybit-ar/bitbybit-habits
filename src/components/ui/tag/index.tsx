import React from "react";
import { cn } from "@/lib/utils";
import styles from "./tag.module.scss";

interface TagProps {
  variant?: "gold" | "green" | "coral";
  children: React.ReactNode;
}

export const Tag: React.FC<TagProps> = ({ variant = "gold", children }) => {
  return (
    <span className={cn(styles.tag, styles[`variant-${variant}`])}>
      {children}
    </span>
  );
};

export default Tag;
