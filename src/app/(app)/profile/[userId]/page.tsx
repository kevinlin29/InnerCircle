"use client";

import { use } from "react";
import ProfileView from "@/components/ProfileView";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  return <ProfileView userId={userId} />;
}
