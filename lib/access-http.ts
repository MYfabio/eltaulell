import "server-only";

import { NextResponse } from "next/server";
import { AccessControlError } from "@/lib/access-control";

export function boardAccessErrorResponse(error: unknown) {
  if (!(error instanceof AccessControlError)) return null;
  return NextResponse.json(
    {
      error:
        error.code === "BOARD_REQUIRED"
          ? "Aquest perfil encara no té cap tauler assignat."
          : "No tens accés al tauler d'aquest grup.",
    },
    { status: error.status },
  );
}
