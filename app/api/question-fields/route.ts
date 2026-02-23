import { NextResponse } from "next/server";
import { readQuestionFields } from "@/lib/question-fields";
import { getCurrentUser } from "@/lib/session";
import { getUserAccessibleQuestionFieldIds } from "@/lib/users";

export async function GET() {
  // Return question-field options for authenticated feature UIs like AI chat.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const fields = await readQuestionFields();
  const accessibleFieldIds = new Set(await getUserAccessibleQuestionFieldIds(user.email));
  return NextResponse.json({
    fields: fields
      .filter((field) => accessibleFieldIds.has(field.id))
      .map((field) => ({
      id: field.id,
      name: field.name,
      })),
  });
}
