export type SessionPolicyInput = {
  expiresAt: Date;
  revokedAt: Date | null;
  sessionUserId: string;
  membershipUserId: string;
  membershipStatus: "INVITED" | "ACTIVE" | "SUSPENDED";
  schoolActive: boolean;
};

export function isSessionUsable(input: SessionPolicyInput, now = new Date()) {
  return input.revokedAt === null
    && input.expiresAt.getTime() > now.getTime()
    && input.sessionUserId === input.membershipUserId
    && input.membershipStatus === "ACTIVE"
    && input.schoolActive;
}
