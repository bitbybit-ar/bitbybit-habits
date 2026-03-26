"use client";

import { useCallback } from "react";
import { useApi } from "./useApi";

export interface FamilyMember {
  user_id: string;
  display_name: string;
  username: string;
  role: string;
  avatar_url: string | null;
}

export interface FamilyWithMembers {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  members: FamilyMember[];
}

export function useFamilies() {
  const result = useApi<FamilyWithMembers[]>("/api/families", []);

  const leaveFamily = useCallback(async (familyId: string) => {
    const res = await fetch("/api/families/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ family_id: familyId }),
    });
    if (res.ok) {
      result.setData((prev) => prev.filter((f) => f.id !== familyId));
      return true;
    }
    return false;
  }, [result]);

  const deleteFamily = useCallback(async (familyId: string) => {
    const res = await fetch(`/api/families/${familyId}`, { method: "DELETE" });
    if (res.ok) {
      result.setData((prev) => prev.filter((f) => f.id !== familyId));
      return true;
    }
    return false;
  }, [result]);

  const changeRole = useCallback(async (familyId: string, userId: string, newRole: string) => {
    const res = await fetch("/api/families/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ family_id: familyId, user_id: userId, new_role: newRole }),
    });
    if (res.ok) {
      result.setData((prev) =>
        prev.map((f) =>
          f.id === familyId
            ? { ...f, members: f.members.map((m) => m.user_id === userId ? { ...m, role: newRole } : m) }
            : f
        )
      );
      return true;
    }
    return false;
  }, [result]);

  const removeMember = useCallback(async (familyId: string, userId: string) => {
    const res = await fetch(`/api/families/${familyId}/members/${userId}`, { method: "DELETE" });
    if (res.ok) {
      result.setData((prev) =>
        prev.map((f) =>
          f.id === familyId
            ? { ...f, members: f.members.filter((m) => m.user_id !== userId) }
            : f
        )
      );
      return true;
    }
    return false;
  }, [result]);

  return {
    ...result,
    leaveFamily,
    deleteFamily,
    changeRole,
    removeMember,
  };
}
