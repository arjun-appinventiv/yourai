/**
 * Super-Admin left-nav — single source of truth.
 *
 * Consumers:
 *   - src/components/Sidebar.jsx  — renders the actual nav
 *   - src/pages/super-admin/FrdGenerator.jsx — populates the "Module" dropdown
 *
 * Keep icons imported where consumed to avoid re-exporting lucide-react types
 * from a non-React module.
 */
export interface NavItem {
  /** User-visible label; also used as the dropdown option in FRD Generator. */
  label: string;
  /** Lucide icon name (resolved at render site). */
  iconName: string;
  /** Route path. */
  path: string;
  /**
   * When true, this item is excluded from the FRD Generator's Module dropdown.
   * Use for the FRD Generator itself so it doesn't list itself.
   */
  excludeFromFrdGenerator?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const SUPER_ADMIN_NAV: NavSection[] = [
  {
    label: 'MAIN',
    items: [
      { label: 'Dashboard', iconName: 'LayoutDashboard', path: '/super-admin/dashboard' },
      { label: 'Tenant Management', iconName: 'Building2', path: '/super-admin/tenants' },
      { label: 'User Management', iconName: 'Users', path: '/super-admin/users' },
      { label: 'Platform Billing', iconName: 'CreditCard', path: '/super-admin/billing' },
      { label: 'Usage & Analytics', iconName: 'BarChart3', path: '/super-admin/usage' },
      { label: 'Compliance & Audit', iconName: 'Shield', path: '/super-admin/compliance' },
    ],
  },
  {
    label: 'CONTENT',
    items: [
      { label: 'Static Content', iconName: 'BookOpen', path: '/super-admin/static-content' },
      { label: 'Workflow Templates', iconName: 'Workflow', path: '/super-admin/workflows' },
    ],
  },
  {
    label: 'LIBRARY',
    items: [
      { label: 'Knowledge Base', iconName: 'Database', path: '/super-admin/knowledge-base' },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { label: 'Notifications', iconName: 'Bell', path: '/super-admin/notifications' },
      { label: 'User Stories', iconName: 'BookMarked', path: '/super-admin/user-stories' },
      { label: 'Settings', iconName: 'Settings', path: '/super-admin/settings' },
      { label: 'Bot Tester', iconName: 'FlaskConical', path: '/super-admin/bot-tester' },
      { label: 'FRD Generator', iconName: 'FileCode2', path: '/super-admin/frd-generator', excludeFromFrdGenerator: true },
    ],
  },
];

/**
 * Returns the flat list of module labels available in the FRD Generator's
 * Module dropdown, for the given platform. Excludes the FRD Generator itself
 * and any items marked with `excludeFromFrdGenerator`.
 *
 * Platform === 'Super Admin': returns labels from SUPER_ADMIN_NAV.
 * Platform === 'Chat View':   returns a curated list of end-user modules.
 */
export function getModuleOptions(platform: 'Super Admin' | 'Chat View'): string[] {
  if (platform === 'Super Admin') {
    return SUPER_ADMIN_NAV.flatMap(section =>
      section.items
        .filter(item => !item.excludeFromFrdGenerator)
        .map(item => item.label)
    );
  }
  // Chat View — end-user modules. Keeps the labels consistent with the
  // prompt's feature-discovery defaults.
  return [
    'New Chat',
    'Ask Question',
    'Citations',
    'Document Upload',
    'Escalate to Lawyer',
    'Chat History',
    'Knowledge Packs',
    'Session Guard',
  ];
}
