import { NextResponse } from "next/server";
import { readQuestionReports } from "@/lib/question-reports";
import { getCurrentAdminUser } from "@/lib/session";

export async function GET() {
  // Return reported questions for admin report management table.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const reports = await readQuestionReports();
  return NextResponse.json({ reports });
}
