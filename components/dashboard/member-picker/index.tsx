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
  selectedId?: string;
  selectedIds?: string[];
  onSelect?: (userId: string) => void;
  onToggle?: (userId: string) => void;
  multiple?: boolean;
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function MemberPicker({ kids, selectedId, selectedIds = [], onSelect, onToggle, multiple }: MemberPickerProps) {
  const t = useTranslations();

  if (kids.length === 0) {
    return (
      <div className={styles.emptyMessage}>
        {t("memberPicker.noKids")}
      </div>
    );
  }

  const handleClick = (userId: string) => {
    if (multiple && onToggle) {
      onToggle(userId);
    } else if (onSelect) {
      onSelect(userId);
    }
  };

  const isSelected = (userId: string) => {
    if (multiple) {
      return selectedIds.includes(userId);
    }
    return userId === selectedId;
  };

  return (
    <div className={styles.memberPicker}>
      {kids.map((kid) => {
        const selected = isSelected(kid.user_id);
        return (
          <button
            key={kid.user_id}
            type="button"
            className={cn(
              styles.memberChip,
              selected && styles.memberChipSelected
            )}
            onClick={() => handleClick(kid.user_id)}
          >
            <div className={styles.avatar}>
              {selected ? (
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
