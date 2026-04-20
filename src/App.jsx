import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import Login from './pages/super-admin/auth/Login';
import VerifyOTP from './pages/super-admin/auth/VerifyOTP';
import ForgotPassword from './pages/super-admin/auth/ForgotPassword';
import ResetPassword from './pages/super-admin/auth/ResetPassword';

// Super Admin pages
import SuperAdminDashboard from './pages/super-admin/Dashboard';
import TenantManagement from './pages/super-admin/TenantManagement';
import UserManagement from './pages/super-admin/UserManagement';
import PlatformBilling from './pages/super-admin/PlatformBilling';
import UsageAnalytics from './pages/super-admin/UsageAnalytics';
import ComplianceAudit from './pages/super-admin/ComplianceAudit';
import StaticContent from './pages/super-admin/StaticContent';
import IntegrationManagement from './pages/super-admin/IntegrationManagement';
import GlobalKnowledgeBase from './pages/super-admin/GlobalKnowledgeBase';
import WorkflowTemplates from './pages/super-admin/WorkflowTemplates';
import BroadcastNotifications from './pages/super-admin/BroadcastNotifications';
import PlatformSettings from './pages/super-admin/PlatformSettings';
import UserStories from './pages/super-admin/UserStories';
import BotTester from './pages/super-admin/BotTester';
import FrdGenerator from './pages/super-admin/FrdGenerator';

// Org Admin imports
import { RoleProvider } from './components/org-admin/RoleContext';
// New tenant role context (used by ChatView sidebar gating)
import { RoleProvider as ChatRoleProvider } from './context/RoleContext';
import OrgLayout from './components/org-admin/OrgLayout';
import Dashboard from './pages/org-admin/Dashboard';
import WorkspaceList from './pages/org-admin/WorkspaceList';
import WorkspaceDetail from './pages/org-admin/WorkspaceDetail';
import DocumentVault from './pages/org-admin/DocumentVault';
import WorkflowsPage from './pages/org-admin/WorkflowsPage';
import KnowledgePacksPage from './pages/org-admin/KnowledgePacksPage';
import ClientsPage from './pages/org-admin/ClientsPage';
import MessagesPage from './pages/org-admin/MessagesPage';
import OrgUserManagement from './pages/org-admin/OrgUserManagement';
import OrgBilling from './pages/org-admin/OrgBilling';
import AuditLogsPage from './pages/org-admin/AuditLogsPage';
import UsageCostsPage from './pages/org-admin/UsageCostsPage';
import ProfilePage from './pages/org-admin/ProfilePage';
import OrgSettingsPage from './pages/org-admin/OrgSettingsPage';
import PlaceholderPage from './pages/org-admin/PlaceholderPage';

// Chatbot pages
import ChatLogin from './pages/chatbot/auth/Login';
import ChatSignUp from './pages/chatbot/auth/SignUp';
import ChatForgotPassword from './pages/chatbot/auth/ForgotPassword';
import ChatResetPassword from './pages/chatbot/auth/ResetPassword';
import ChatOnboarding from './pages/chatbot/auth/Onboarding';
import ChatView from './pages/chatbot/ChatView';
import WorkspaceChatView from './pages/chatbot/WorkspaceChatView';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import RouteTitle from './components/RouteTitle';

import { Clock, Sparkles } from 'lucide-react';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <RouteTitle />
          <Routes>
            <Route path="/" element={<Navigate to="/super-admin/dashboard" replace />} />

            {/* Auth routes — no sidebar/topbar */}
            <Route path="/super-admin/login" element={<Login />} />
            <Route path="/super-admin/verify-otp" element={<VerifyOTP />} />
            <Route path="/super-admin/forgot-password" element={<ForgotPassword />} />
            <Route path="/super-admin/reset-password" element={<ResetPassword />} />

            {/* Protected Super Admin routes */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
              <Route path="/super-admin/tenants" element={<TenantManagement />} />
              <Route path="/super-admin/users" element={<UserManagement />} />
              <Route path="/super-admin/billing" element={<PlatformBilling />} />
              <Route path="/super-admin/usage" element={<UsageAnalytics />} />
              <Route path="/super-admin/compliance" element={<ComplianceAudit />} />
              <Route path="/super-admin/static-content" element={<StaticContent />} />
              <Route path="/super-admin/integrations" element={<IntegrationManagement />} />
              <Route path="/super-admin/knowledge-base" element={<GlobalKnowledgeBase />} />
              <Route path="/super-admin/workflows" element={<WorkflowTemplates />} />
              <Route path="/super-admin/notifications" element={<BroadcastNotifications />} />
              <Route path="/super-admin/settings" element={<PlatformSettings />} />
              <Route path="/super-admin/user-stories" element={<UserStories />} />
              <Route path="/super-admin/bot-tester" element={<BotTester />} />
              <Route path="/super-admin/frd-generator" element={<FrdGenerator />} />
            </Route>

            {/* Chatbot routes */}
            <Route path="/chat/login" element={<ChatLogin />} />
            <Route path="/chat/signup" element={<ChatSignUp />} />
            <Route path="/chat/forgot-password" element={<ChatForgotPassword />} />
            <Route path="/chat/reset-password" element={<ChatResetPassword />} />
            <Route path="/chat/onboarding" element={<ChatOnboarding />} />
            <Route path="/chat" element={<ChatRoleProvider><ChatView /></ChatRoleProvider>} />
            <Route path="/chat/workspaces" element={<ChatRoleProvider><ChatView initialView="workspaces" /></ChatRoleProvider>} />
            <Route path="/chat/workspaces/:id" element={<RouteErrorBoundary><ChatRoleProvider><WorkspaceChatView /></ChatRoleProvider></RouteErrorBoundary>} />

            {/* Org Admin routes */}
            <Route
              element={
                <RoleProvider>
                  <OrgLayout />
                </RoleProvider>
              }
            >
              <Route path="/app/dashboard" element={<Dashboard />} />
              <Route path="/app/workspaces" element={<WorkspaceList />} />
              <Route path="/app/workspaces/:id" element={<WorkspaceDetail />} />
              <Route path="/app/vault" element={<DocumentVault />} />
              <Route path="/app/workflows" element={<WorkflowsPage />} />
              <Route path="/app/knowledge-packs" element={<KnowledgePacksPage />} />
              <Route path="/app/clients" element={<ClientsPage />} />
              <Route path="/app/messages" element={<MessagesPage />} />
              <Route path="/app/users" element={<OrgUserManagement />} />
              <Route path="/app/billing" element={<OrgBilling />} />
              <Route path="/app/audit-logs" element={<AuditLogsPage />} />
              <Route path="/app/usage" element={<UsageCostsPage />} />
              <Route path="/app/profile" element={<ProfilePage />} />
              <Route path="/app/settings" element={<OrgSettingsPage />} />
              <Route path="/app/prompt-templates" element={<PlaceholderPage title="Prompt Templates" icon={Sparkles} />} />
              <Route path="/app/reminders" element={<PlaceholderPage title="Reminders" icon={Clock} />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
