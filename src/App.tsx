import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Index from "./pages/Index";
import UserAlerts from "./pages/UserAlerts";
import Auth from "./pages/Auth";
import OutlookCallback from "./pages/OutlookCallback";
import Settings from "./pages/Settings";
import MLAnalytics from "./pages/MLAnalytics";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminEmails from "./pages/admin/AdminEmails";
import AdminAlerts from "./pages/admin/AdminAlerts";
import AdminActions from "./pages/admin/AdminActions";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminSettings from "./pages/admin/AdminSettings";
import { AdminLayout } from "./components/admin/AdminLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/outlook-callback" element={<OutlookCallback />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/alerts" element={<UserAlerts />} />
              <Route path="/ml-analytics" element={<MLAnalytics />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
              <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
              <Route path="/admin/emails" element={<AdminLayout><AdminEmails /></AdminLayout>} />
              <Route path="/admin/alerts" element={<AdminLayout><AdminAlerts /></AdminLayout>} />
              <Route path="/admin/actions" element={<AdminLayout><AdminActions /></AdminLayout>} />
              <Route path="/admin/audit" element={<AdminLayout><AdminAudit /></AdminLayout>} />
              <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
