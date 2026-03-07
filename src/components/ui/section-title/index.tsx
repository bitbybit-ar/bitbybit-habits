import React from "react";
import styles from "./section-title.module.scss";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  id?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle, id }) => {
  return (
    <div className={styles.sectionTitle}>
      <h2 id={id}>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
};

export default SectionTitle;
