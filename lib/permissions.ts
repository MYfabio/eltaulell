export const PERMISSIONS = {
  VIEW_BOARD: "board:view",
  CREATE_NOTICE: "board:notice:create",
  CREATE_TASK: "board:task:create",
  CREATE_ACTIVITY: "board:activity:create",
  CREATE_MATERIAL: "board:material:create",
  MODERATE_BOARD: "board:moderate",
  CREATE_POLL: "poll:create",
  VOTE_POLL: "poll:vote",
  SUBMIT_ANONYMOUS_QUERY: "query:anonymous:submit",
  VIEW_ANONYMOUS_INBOX: "query:anonymous:view",
  VIEW_GROUP_DASHBOARD: "group:dashboard:view",
  VIEW_STUDENT_FOLLOWUP: "student:followup:view",
  MANAGE_CALENDAR: "calendar:manage",
  VIEW_OWN_SPACE: "profile:own:view",
  USE_ASSISTANT: "assistant:use",
  MANAGE_SCHOOL: "school:manage",
  MANAGE_USERS: "users:manage",
  MANAGE_GROUPS: "groups:manage",
  MANAGE_INTEGRATIONS: "integrations:manage",
  VIEW_AUDIT_LOG: "audit:view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type AppRole = "COORDINATOR" | "TUTOR" | "DELEGATE" | "STUDENT";
export type PostKind = "NOTICE" | "TASK" | "ACTIVITY" | "MATERIAL";

const COMMON_PERMISSIONS: Permission[] = [
  PERMISSIONS.VIEW_BOARD,
  PERMISSIONS.VOTE_POLL,
  PERMISSIONS.SUBMIT_ANONYMOUS_QUERY,
  PERMISSIONS.VIEW_OWN_SPACE,
  PERMISSIONS.USE_ASSISTANT,
];

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  COORDINATOR: [
    ...COMMON_PERMISSIONS,
    PERMISSIONS.CREATE_NOTICE,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.CREATE_ACTIVITY,
    PERMISSIONS.CREATE_MATERIAL,
    PERMISSIONS.MODERATE_BOARD,
    PERMISSIONS.CREATE_POLL,
    PERMISSIONS.VIEW_ANONYMOUS_INBOX,
    PERMISSIONS.VIEW_GROUP_DASHBOARD,
    PERMISSIONS.VIEW_STUDENT_FOLLOWUP,
    PERMISSIONS.MANAGE_CALENDAR,
    PERMISSIONS.MANAGE_SCHOOL,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_GROUPS,
    PERMISSIONS.MANAGE_INTEGRATIONS,
    PERMISSIONS.VIEW_AUDIT_LOG,
  ],
  TUTOR: [
    ...COMMON_PERMISSIONS,
    PERMISSIONS.CREATE_NOTICE,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.CREATE_ACTIVITY,
    PERMISSIONS.CREATE_MATERIAL,
    PERMISSIONS.MODERATE_BOARD,
    PERMISSIONS.CREATE_POLL,
    PERMISSIONS.VIEW_ANONYMOUS_INBOX,
    PERMISSIONS.VIEW_GROUP_DASHBOARD,
    PERMISSIONS.VIEW_STUDENT_FOLLOWUP,
    PERMISSIONS.MANAGE_CALENDAR,
  ],
  DELEGATE: [
    ...COMMON_PERMISSIONS,
    PERMISSIONS.CREATE_ACTIVITY,
    PERMISSIONS.CREATE_POLL,
    PERMISSIONS.VIEW_GROUP_DASHBOARD,
  ],
  STUDENT: [...COMMON_PERMISSIONS],
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.VIEW_BOARD]: "Veure el tauler",
  [PERMISSIONS.CREATE_NOTICE]: "Publicar avisos",
  [PERMISSIONS.CREATE_TASK]: "Publicar tasques",
  [PERMISSIONS.CREATE_ACTIVITY]: "Publicar activitats",
  [PERMISSIONS.CREATE_MATERIAL]: "Publicar materials",
  [PERMISSIONS.MODERATE_BOARD]: "Moderar el tauler",
  [PERMISSIONS.CREATE_POLL]: "Crear consultes",
  [PERMISSIONS.VOTE_POLL]: "Participar en consultes",
  [PERMISSIONS.SUBMIT_ANONYMOUS_QUERY]: "Demanar ajuda anònimament",
  [PERMISSIONS.VIEW_ANONYMOUS_INBOX]: "Revisar consultes anònimes",
  [PERMISSIONS.VIEW_GROUP_DASHBOARD]: "Veure l’espai del grup",
  [PERMISSIONS.VIEW_STUDENT_FOLLOWUP]: "Seguiment individual",
  [PERMISSIONS.MANAGE_CALENDAR]: "Gestionar el calendari",
  [PERMISSIONS.VIEW_OWN_SPACE]: "Veure l’espai personal",
  [PERMISSIONS.USE_ASSISTANT]: "Utilitzar l’assistent",
  [PERMISSIONS.MANAGE_SCHOOL]: "Administrar el centre",
  [PERMISSIONS.MANAGE_USERS]: "Gestionar persones i rols",
  [PERMISSIONS.MANAGE_GROUPS]: "Gestionar grups",
  [PERMISSIONS.MANAGE_INTEGRATIONS]: "Configurar integracions",
  [PERMISSIONS.VIEW_AUDIT_LOG]: "Consultar l’auditoria",
};

export const POST_KIND_PERMISSION: Record<PostKind, Permission> = {
  NOTICE: PERMISSIONS.CREATE_NOTICE,
  TASK: PERMISSIONS.CREATE_TASK,
  ACTIVITY: PERMISSIONS.CREATE_ACTIVITY,
  MATERIAL: PERMISSIONS.CREATE_MATERIAL,
};

type RoleHolder = AppRole | { role: AppRole };

function roleOf(value: RoleHolder) {
  return typeof value === "string" ? value : value.role;
}

export function permissionsForRole(role: AppRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function can(value: RoleHolder, permission: Permission) {
  return ROLE_PERMISSIONS[roleOf(value)].includes(permission);
}

export function canAny(value: RoleHolder, permissions: readonly Permission[]) {
  return permissions.some((permission) => can(value, permission));
}

export function canCreatePost(value: RoleHolder, kind: PostKind) {
  return can(value, POST_KIND_PERMISSION[kind]);
}
