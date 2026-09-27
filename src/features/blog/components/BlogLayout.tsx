import { Outlet } from "@tanstack/react-router";
import { DetailLayout } from "@/components/layout/DetailLayout";

export function BlogLayout() {
  return (
    <DetailLayout>
      <Outlet />
    </DetailLayout>
  );
}
