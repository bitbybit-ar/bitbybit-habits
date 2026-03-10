"use client";

import { useTranslations } from "next-intl";
import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import styles from "./member-picker.module.scss";

interface KidMember {
  user_id: string;
  display_name: string;
}

interface MemberPickerProps {
  kids: KidMember[];
  selectedId: string;
  onSelect: (userId: string) => void;
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function MemberPicker({ kids, selectedId, onSelect }: MemberPickerProps) {
  const t = useTranslations();

  if (kids.length === 0) {
    return (
      <div className={styles.emptyMessage}>
        {t("memberPicker.noKids")}
      </div>
    );
  }

  return (
    <div className={styles.memberPicker}>
      {kids.map((kid) => {
        const isSelected = kid.user_id === selectedId;
        return (
          <button
            key={kid.user_id}
            type="button"
            className={cn(
              styles.memberChip,
              isSelected && styles.memberChipSelected
            )}
            onClick={() => onSelect(kid.user_id)}
          >
            <div className={styles.avatar}>
              {isSelected ? (
                <div className={styles.checkOverlay}>
                  <CheckIcon size={14} color="currentColor" />
                </div>
              ) : (
                getInitial(kid.display_name)
              )}
            </div>
            <span className={styles.memberName}>{kid.display_name}</span>
            <span className={styles.roleBadge}>{t("auth.kid")}</span>
          </button>
        );
      })}
    </div>
  );
}

export default MemberPicker;
