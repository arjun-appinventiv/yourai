// ─── Role and permission model for the Chat tenant (Org) ────────────────────
//
// Roles exist within a single tenant (org). They are separate from the
// Super Admin portal's `ADMIN` role on the User object — which, for tenant
// purposes, we interpret as ORG_ADMIN (the first user to sign up for the org).
//
// ORG_ADMIN      — full permissions, cannot be restricted.
// INTERNAL_USER  — org member (attorney, paralegal, partner). Base perms
//                  always on + any optional perms the Org Admin granted.
// EXTERNAL_USER  — end client. Very limited. Workspace-scoped only.
//
// Permission checks go through hasPermission(p) on the RoleContext — never
// compare role strings in component logic.

export type Role = 'ORG_ADMIN' | 'INTERNAL_USER' | 'EXTERNAL_USER';

export const ROLE = {
  ORG_ADMIN: 'ORG_ADMIN' as const,
  INTERNAL_USER: 'INTERNAL_USER' as const,
  EXTERNAL_USER: 'EXTERNAL_USER' as const,
};

export const PERMISSIONS = {
  // Team
  INVITE_TEAM:            'invite_team',
  ASSIGN_ROLES:           'assign_roles',

  // Workspaces
  CREATE_WORKSPACE:           'create_workspace',
  DELETE_WORKSPACE:           'delete_workspace',
  TRANSFER_WORKSPACE:         'transfer_workspace',
  MANAGE_WORKSPACE_MEMBERS:   'manage_workspace_members',
  ADD_TO_WORKSPACE:           'add_to_workspace',
  REMOVE_FROM_WORKSPACE:      'remove_from_workspace',

  // Documents
  UPLOAD_DOCUMENTS:       'upload_documents',
  MANAGE_DOCUMENT_VAULT:  'manage_document_vault',

  // Knowledge & AI
  MANAGE_KNOWLEDGE_PACKS:  'manage_knowledge_packs',
  CREATE_GLOBAL_KP:        'create_global_knowledge_pack',
  MANAGE_PROMPT_TEMPLATES: 'manage_prompt_templates',

  // Clients
  MANAGE_CLIENTS:        'manage_clients',
  CLIENT_PORTAL_MGMT:    'client_portal_management',

  // Security & Compliance
  VIEW_AUDIT_LOGS:           'view_audit_logs',
  EXPORT_COMPLIANCE_REPORTS: 'export_compliance_reports',

  // Analytics
  VIEW_USAGE_REPORTS:    'view_usage_reports',

  // Billing (CHANGE_PLAN + MODIFY_PAYMENT are Org Admin only, never grantable)
  ACCESS_BILLING:        'access_billing',
  MODIFY_PAYMENT:        'modify_payment',
  CHANGE_PLAN:           'change_plan',

  // Matters & Chat
  OPEN_MATTER:            'open_matter',
  CHAT_MODE_TOGGLE:       'chat_mode_toggle',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Every permission in the system — ORG_ADMIN always gets this set. */
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/** Permissions an Internal User always has, regardless of what Org Admin selected. */
export const INTERNAL_USER_BASE: Permission[] = [
  PERMISSIONS.UPLOAD_DOCUMENTS,
  PERMISSIONS.MANAGE_KNOWLEDGE_PACKS, // scoped to own packs in the UI
  PERMISSIONS.OPEN_MATTER,
];

/** Permissions an Org Admin can *optionally* grant to an Internal User during invite. */
export const INTERNAL_USER_OPTIONAL: Permission[] = [
  // Workspaces
  PERMISSIONS.CREATE_WORKSPACE,
  PERMISSIONS.TRANSFER_WORKSPACE,
  PERMISSIONS.MANAGE_WORKSPACE_MEMBERS,
  // Knowledge & AI
  PERMISSIONS.CREATE_GLOBAL_KP,
  PERMISSIONS.MANAGE_PROMPT_TEMPLATES,
  PERMISSIONS.MANAGE_DOCUMENT_VAULT,
  // Clients & Team
  PERMISSIONS.MANAGE_CLIENTS,
  // Security & Compliance
  PERMISSIONS.VIEW_AUDIT_LOGS,
  PERMISSIONS.EXPORT_COMPLIANCE_REPORTS,
  // Analytics & Billing
  PERMISSIONS.VIEW_USAGE_REPORTS,
  PERMISSIONS.ACCESS_BILLING,
];

/** Permissions an External User always has. Nothing else is ever grantable. */
export const EXTERNAL_USER_BASE: Permission[] = [
  PERMISSIONS.UPLOAD_DOCUMENTS,    // own workspace only (enforced by UI)
  PERMISSIONS.CHAT_MODE_TOGGLE,
];

/**
 * Resolve the effective permission set for a user given their role and the
 * optional extras an Org Admin granted them.
 *
 * - ORG_ADMIN ignores `granted` and always receives ALL_PERMISSIONS.
 * - INTERNAL_USER gets base ∪ (granted ∩ INTERNAL_USER_OPTIONAL).
 * - EXTERNAL_USER gets EXTERNAL_USER_BASE regardless of `granted`.
 */
export function resolvePermissions(
  role: Role,
  granted: Permission[] = []
): Permission[] {
  if (role === ROLE.ORG_ADMIN) return [...ALL_PERMISSIONS];

  if (role === ROLE.INTERNAL_USER) {
    const optional = granted.filter((p) => INTERNAL_USER_OPTIONAL.includes(p));
    return Array.from(new Set([...INTERNAL_USER_BASE, ...optional]));
  }

  // EXTERNAL_USER — never inherits anything from `granted`
  return [...EXTERNAL_USER_BASE];
}

/** Human-readable label for a role, used in badges and copy. */
export const ROLE_LABEL: Record<Role, string> = {
  ORG_ADMIN:     'Org Admin',
  INTERNAL_USER: 'Internal User',
  EXTERNAL_USER: 'External / Client',
};

/**
 * Metadata for the Org-Admin-grantable optional permissions, used to render
 * the Invite Team checkboxes. Grouped into the same sections the FRD calls for.
 */
export type PermissionGroup = {
  section: string;
  items: Array<{
    permission: Permission;
    label: string;
    description: string;
  }>;
};

export const INVITE_PERMISSION_GROUPS: PermissionGroup[] = [
  {
    section: 'Workspaces & Matters',
    items: [
      {
        permission: PERMISSIONS.CREATE_WORKSPACE,
        label: 'Create Workspaces',
        description:
          'Spin up new case rooms. The creator automatically becomes the owner and can add colleagues and clients.',
      },
      {
        permission: PERMISSIONS.TRANSFER_WORKSPACE,
        label: 'Transfer Workspace Ownership',
        description:
          'Hand over ownership of a workspace to another member — useful when a matter moves to a different lead attorney.',
      },
      {
        permission: PERMISSIONS.MANAGE_WORKSPACE_MEMBERS,
        label: 'Manage Members Across All Workspaces',
        description:
          'Add or remove members from any workspace in the org, not just ones they own. Intended for office administrators.',
      },
    ],
  },
  {
    section: 'AI & Knowledge',
    items: [
      {
        permission: PERMISSIONS.CREATE_GLOBAL_KP,
        label: 'Create Org-Wide Knowledge Packs',
        description:
          'Publish knowledge packs so every Internal User in the firm can attach them to their chats. Private packs remain user-scoped.',
      },
      {
        permission: PERMISSIONS.MANAGE_PROMPT_TEMPLATES,
        label: 'Manage Prompt Templates',
        description:
          'Create and edit prompt templates shared with the whole firm (e.g., standard contract-review prompts).',
      },
      {
        permission: PERMISSIONS.MANAGE_DOCUMENT_VAULT,
        label: 'Manage Document Vault',
        description:
          'Perform bulk operations across the firm-wide Document Vault — rename, version, or remove documents uploaded by others.',
      },
    ],
  },
  {
    section: 'Clients',
    items: [
      {
        permission: PERMISSIONS.MANAGE_CLIENTS,
        label: 'Manage Client Directory',
        description:
          'Add, edit, or archive clients in the firm directory. Required to onboard a new client or update contact information.',
      },
    ],
  },
  {
    section: 'Security & Compliance',
    items: [
      {
        permission: PERMISSIONS.VIEW_AUDIT_LOGS,
        label: 'View Audit Logs',
        description:
          'See the full activity log across the org — logins, document access, permission changes, invitations.',
      },
      {
        permission: PERMISSIONS.EXPORT_COMPLIANCE_REPORTS,
        label: 'Export Compliance Reports',
        description:
          'Generate and export PDF compliance summaries for SOC 2, HIPAA, or state bar audits.',
      },
    ],
  },
  {
    section: 'Analytics & Billing',
    items: [
      {
        permission: PERMISSIONS.VIEW_USAGE_REPORTS,
        label: 'View Usage & Cost Reports',
        description:
          'See AI token consumption, document counts, and storage use — by user, by workspace, and overall.',
      },
      {
        permission: PERMISSIONS.ACCESS_BILLING,
        label: 'Access Billing Dashboard',
        description:
          'View invoices, current plan, and payment history. Changing the plan or payment method remains Org Admin only.',
      },
    ],
  },
];

/** Read-only base perms shown at the top of the invite form as checked items. */
export const INVITE_BASE_PERMISSIONS: Array<{
  permission: Permission;
  label: string;
}> = [
  { permission: PERMISSIONS.UPLOAD_DOCUMENTS,       label: 'Upload documents' },
  { permission: PERMISSIONS.MANAGE_KNOWLEDGE_PACKS, label: 'Manage own knowledge packs' },
  { permission: PERMISSIONS.OPEN_MATTER,            label: 'Open matters' },
];
