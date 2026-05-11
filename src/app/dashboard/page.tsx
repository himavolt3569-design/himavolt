"use client";

import OverviewTab from "@/components/dashboard/OverviewTab";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <OverviewTab
      userName={user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? undefined}
    />
  );
}
