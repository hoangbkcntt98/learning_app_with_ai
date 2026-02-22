import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { GameClient } from "./game-client";

export default async function PlayPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <GameClient initialPoints={user.points} initialLevel={user.level} />;
}
