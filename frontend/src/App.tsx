import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import "./App.css";
import "./styles/dashboard.css";

import Dashboard from "./pages/Dashboard";
import AIProcessing from "./pages/AIProcessing";
import Verification from "./pages/Verification";
import VerifiedDirectives from "./pages/VerifiedDirectives";
import ActionPlan from "./pages/ActionPlan";
import Login from "./pages/Login";
import Register from "./pages/Register";
import type { JSX } from "react";
import ChatAssistantDrawer from "./pages/ChatAssistantDrawer";
import UploadJudgement from "./pages/UploadJudgement";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Deadlines from "./pages/Deadlines";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LifecycleTracking from "./pages/LifecycleTracking";
import AlertsEscalation from "./pages/AlertsEscalation";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();

  const showChat =
    user &&
    location.pathname !== "/login" &&
    location.pathname !== "/register";

  return (
    <>
      {showChat && <ChatAssistantDrawer />}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadJudgement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/processing"
          element={
            <ProtectedRoute>
              <AIProcessing />
            </ProtectedRoute>
          }
        />

        <Route
          path="/verification"
          element={
            <ProtectedRoute>
              <Verification />
            </ProtectedRoute>
          }
        />

        <Route
          path="/verified-directives"
          element={
            <ProtectedRoute>
              <VerifiedDirectives />
            </ProtectedRoute>
          }
        />

        <Route
          path="/action-plan"
          element={
            <ProtectedRoute>
              <ActionPlan />
            </ProtectedRoute>
          }
        />

        <Route
          path="/lifecycle"
          element={
            <ProtectedRoute>
              <LifecycleTracking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/deadlines"
          element={
            <ProtectedRoute>
              <Deadlines />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cases"
          element={
            <ProtectedRoute>
              <Cases />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cases/:caseId"
          element={
            <ProtectedRoute>
              <CaseDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <AlertsEscalation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatAssistant />
            </ProtectedRoute>
          }
        /> */}
      </Routes>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;