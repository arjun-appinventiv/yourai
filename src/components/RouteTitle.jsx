import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';

/**
 * Sets document.title based on the current route. Mounted once inside the
 * <BrowserRouter> tree so useLocation works. Kept here (not in App) to
 * avoid polluting the main component.
 *
 * Keep titles short — browsers truncate after ~30–40 chars in a tab.
 */

// Static route → title map. More specific paths are matched first via
// prefix/startsWith below, so ordering in this array matters a little
// (longest-prefix wins).
const ROUTE_TITLES = [
  // Super Admin
  { match: (p) => p.startsWith('/super-admin/dashboard'),        title: 'Dashboard' },
  { match: (p) => p.startsWith('/super-admin/tenants'),          title: 'Tenant Management' },
  { match: (p) => p.startsWith('/super-admin/users'),            title: 'Platform Users' },
  { match: (p) => p.startsWith('/super-admin/billing'),          title: 'Billing & Subscriptions' },
  { match: (p) => p.startsWith('/super-admin/usage'),            title: 'Usage & Analytics' },
  { match: (p) => p.startsWith('/super-admin/compliance'),       title: 'Compliance & Audit' },
  { match: (p) => p.startsWith('/super-admin/static-content'),   title: 'Static Content' },
  { match: (p) => p.startsWith('/super-admin/integrations'),     title: 'Integrations' },
  { match: (p) => p.startsWith('/super-admin/knowledge-base'),   title: 'Knowledge Base' },
  { match: (p) => p.startsWith('/super-admin/workflows'),        title: 'Workflow Templates' },
  { match: (p) => p.startsWith('/super-admin/notifications'),    title: 'Notifications' },
  { match: (p) => p.startsWith('/super-admin/settings'),         title: 'Platform Settings' },
  { match: (p) => p.startsWith('/super-admin/user-stories'),     title: 'User Stories' },
  { match: (p) => p.startsWith('/super-admin/frd-generator'),    title: 'FRD Generator' },
  { match: (p) => p.startsWith('/super-admin/bot-tester'),       title: 'Bot Tester' },
  { match: (p) => p.startsWith('/super-admin/login'),            title: 'Sign In — Operators' },
  { match: (p) => p.startsWith('/super-admin/verify-otp'),       title: 'Verify OTP' },
  { match: (p) => p.startsWith('/super-admin'),                  title: 'Super Admin' },

  // Org Admin / app portal
  { match: (p) => p.startsWith('/app/dashboard'),         title: 'Dashboard' },
  { match: (p) => p.startsWith('/app/workspaces/'),       title: 'Workspace' },
  { match: (p) => p.startsWith('/app/workspaces'),        title: 'Workspaces' },
  { match: (p) => p.startsWith('/app/vault'),             title: 'Document Vault' },
  { match: (p) => p.startsWith('/app/workflows'),         title: 'Workflows' },
  { match: (p) => p.startsWith('/app/knowledge-packs'),   title: 'Knowledge Packs' },
  { match: (p) => p.startsWith('/app/clients'),           title: 'Clients' },
  { match: (p) => p.startsWith('/app/messages'),          title: 'Messages' },
  { match: (p) => p.startsWith('/app/users'),             title: 'Users' },
  { match: (p) => p.startsWith('/app/billing'),           title: 'Billing' },
  { match: (p) => p.startsWith('/app/audit-logs'),        title: 'Audit Logs' },
  { match: (p) => p.startsWith('/app/usage'),             title: 'Usage & Costs' },
  { match: (p) => p.startsWith('/app/profile'),           title: 'Profile' },
  { match: (p) => p.startsWith('/app/settings'),          title: 'Settings' },
  { match: (p) => p.startsWith('/app/prompt-templates'),  title: 'Prompt Templates' },
  { match: (p) => p.startsWith('/app/reminders'),         title: 'Reminders' },
  { match: (p) => p.startsWith('/app'),                   title: 'Workspace' },

  // ChatView
  { match: (p) => p === '/chat/login',             title: 'Sign In' },
  { match: (p) => p === '/chat/signup',            title: 'Create Account' },
  { match: (p) => p === '/chat/forgot-password',   title: 'Reset Password' },
  { match: (p) => p === '/chat/reset-password',    title: 'Reset Password' },
  { match: (p) => p === '/chat/onboarding',        title: 'Welcome' },
  { match: (p) => p.startsWith('/chat/workspaces/'), title: 'Workspace' },
  { match: (p) => p === '/chat/workspaces',        title: 'Workspaces' },
  { match: (p) => p === '/chat/home',              title: 'Home' },
  { match: (p) => p === '/chat',                   title: 'Chat' },
];

function resolveTitle(pathname) {
  for (const r of ROUTE_TITLES) {
    if (r.match(pathname)) return r.title;
  }
  return null;
}

export default function RouteTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = resolveTitle(pathname);
    document.title = page ? `${page} · YourAI` : 'YourAI';
  }, [pathname]);
  return null;
}
