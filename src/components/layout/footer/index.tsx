import React from "react";
import styles from "./footer.module.scss";

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <p>
        Built for <strong>La Crypta Lightning Hackathons 2026</strong>
      </p>
      <p>Powered by Lightning Network · Nostr · OpenClaw · NWC</p>
      <br />
      <p className={styles.motto}>⚡ Bitcoin o Muerte 💀</p>
    </footer>
  );
};

export default Footer;
