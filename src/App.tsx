import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ToastProvider } from "@/hooks/useToast";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { RequirePermission } from "@/components/layout/RequirePermission";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { GroupsPage } from "@/pages/GroupsPage";
import { ImportsPage } from "@/pages/ImportsPage";
import { CampaignsPage } from "@/pages/CampaignsPage";
import { CampaignDetailPage } from "@/pages/campaigns/CampaignDetailPage";
import { MessagesPage } from "@/pages/MessagesPage";
import { SchedulesPage } from "@/pages/SchedulesPage";
import { ProviderPage } from "@/pages/ProviderPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { UsersPage } from "@/pages/UsersPage";
import { AuditPage } from "@/pages/AuditPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />

                <Route
                  path="customers"
                  element={
                    <RequirePermission permission="customers:read">
                      <CustomersPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="groups"
                  element={
                    <RequirePermission permission="groups:read">
                      <GroupsPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="imports"
                  element={
                    <RequirePermission permission="imports:read">
                      <ImportsPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="campaigns"
                  element={
                    <RequirePermission permission="campaigns:read">
                      <CampaignsPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="campaigns/:id"
                  element={
                    <RequirePermission permission="campaigns:read">
                      <CampaignDetailPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="messages"
                  element={
                    <RequirePermission permission="messages:read">
                      <MessagesPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="schedules"
                  element={
                    <RequirePermission permission="schedules:read">
                      <SchedulesPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="provider"
                  element={
                    <RequirePermission permission="provider:read">
                      <ProviderPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <RequirePermission permission="settings:read">
                      <SettingsPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="reports"
                  element={
                    <RequirePermission permission="reports:read">
                      <ReportsPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="users"
                  element={
                    <RequirePermission permission="users:read">
                      <UsersPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <RequirePermission permission="audit:read">
                      <AuditPage />
                    </RequirePermission>
                  }
                />
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
