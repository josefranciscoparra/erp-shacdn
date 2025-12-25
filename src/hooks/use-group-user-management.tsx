"use client";

import { useEffect, useState } from "react";

import { listManageableGroupsForUser, type ManageableGroupSummary } from "@/server/actions/organization-groups-view";

type GroupUserManagementState = {
  groups: ManageableGroupSummary[];
  isLoading: boolean;
  error: string | null;
};

export function useGroupUserManagement() {
  const [state, setState] = useState<GroupUserManagementState>({
    groups: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const result = await listManageableGroupsForUser();
        if (!isMounted) return;

        if (!result.success || !result.groups) {
          setState((prev) => ({
            ...prev,
            groups: [],
            isLoading: false,
            error: result.error ?? "No se pudieron cargar los grupos",
          }));
          return;
        }

        setState({
          groups: result.groups,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (!isMounted) return;
        setState({
          groups: [],
          isLoading: false,
          error: error instanceof Error ? error.message : "No se pudieron cargar los grupos",
        });
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    groups: state.groups,
    isLoading: state.isLoading,
    error: state.error,
    hasGroups: state.groups.length > 0,
  };
}
