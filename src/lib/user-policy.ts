import type { Role } from "@prisma/client";

type AdminChange = {
  activeAdminCount: number;
  actorId: string;
  nextActive: boolean;
  nextRole: Role;
  targetActive: boolean;
  targetId: string;
  targetRole: Role;
};

export function getAdminChangeError(change: AdminChange) {
  const changesOwnAdminAccess =
    change.targetId === change.actorId &&
    (!change.nextActive || change.nextRole !== "ADMIN");

  if (changesOwnAdminAccess) {
    return "Der eigene Adminzugang kann nicht deaktiviert oder herabgestuft werden.";
  }

  const removesActiveAdmin =
    change.targetRole === "ADMIN" &&
    change.targetActive &&
    (!change.nextActive || change.nextRole !== "ADMIN");

  if (removesActiveAdmin && change.activeAdminCount <= 1) {
    return "Mindestens ein aktiver Admin muss erhalten bleiben.";
  }

  return null;
}
