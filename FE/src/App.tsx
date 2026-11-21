import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ForcePasswordChangeModal from "./components/auth/ForcePasswordChangeModal";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SystemProvider } from "@/contexts/SystemContext";
import { SocketProvider } from "@/contexts/SocketContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import ManageCourses from "./pages/teacher/ManageCourses";
import TeacherCourseDetail from "./pages/teacher/CourseDetail";
import TeacherClasses from "./pages/teacher/ManageClasses";
import StudentCourseDetail from "./pages/student/CourseDetail";
import StudentAttendancePage from './pages/student/Attendance';
import ClassAssignments from "./pages/teacher/ClassAssignments";

import AdminUsers from "./pages/admin/Users";
import AdminClasses from "./pages/admin/ManageClasses";
import AdminClassDetail from "./pages/admin/ClassDetail";
import AdminShifts from "./pages/admin/ManageShifts";
import AdminCategories from "./pages/admin/ManageCategories";

import MyCourses from "./pages/student/MyCourses";
import Assignments from "./pages/student/Assignments";
import MyGradesPage from "./pages/student/MyGrades";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import TeacherSchedule from "./pages/teacher/TeacherSchedule";


const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Ant Design Theme Config
const antTheme = {
  token: {
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
};

const AppRoutes = () => {
  const { user, logout } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-courses"
          element={
            <ProtectedRoute>
              <ManageCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/classes"
          element={
            <ProtectedRoute>
              <TeacherClasses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/class/:id/assignments"
          element={
            <ProtectedRoute>
              <ClassAssignments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/course/:id"
          element={
            <ProtectedRoute>
              <TeacherCourseDetail />
            </ProtectedRoute>
          }
        />


          {/* Quản lý danh mục */}
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute>
                {user?.role === 'ADMIN' ? <AdminCategories /> : <Navigate to="/dashboard" replace />}
              </ProtectedRoute>
            }
          />

          {/* Quản lý ca học */}
        {/* Staff Routes */}
        <Route
          path="/staff/users"
          element={
            <ProtectedRoute>
              {user?.role === 'STAFF' ? <AdminUsers /> : <Navigate to="/dashboard" replace />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/classes"
          element={
            <ProtectedRoute>
              {user?.role === 'STAFF' ? <AdminClasses /> : <Navigate to="/dashboard" replace />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/class/:id"
          element={
            <ProtectedRoute>
              {user?.role === 'STAFF' ? <AdminClassDetail /> : <Navigate to="/dashboard" replace />}
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/schedule"
          element={
            <ProtectedRoute>
              {user?.role === 'TEACHER' ? <TeacherSchedule /> : <Navigate to="/dashboard" replace />}
            </ProtectedRoute>
          }
        />
        
        {/* Admin/Head Staff Routes */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              {user?.role === 'ADMIN' || user?.role === 'HEAD_STAFF' ? <AdminUsers /> : <Navigate to="/dashboard" replace />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/all-courses"
          element={
            <ProtectedRoute>
              <ManageCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/classes"
          element={
            <ProtectedRoute>
              {user?.role === 'ADMIN' || user?.role === 'HEAD_STAFF' ? <AdminClasses /> : <Navigate to="/dashboard" replace />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/class/:id"
          element={
            <ProtectedRoute>
              {user?.role === 'ADMIN' || user?.role === 'HEAD_STAFF' || user?.role === 'TEACHER' ? <AdminClassDetail /> : <Navigate to="/dashboard" replace />}
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/shifts"
          element={
            <ProtectedRoute>
              {user?.role === 'ADMIN' || user?.role === 'HEAD_STAFF' ? <AdminShifts /> : <Navigate to="/dashboard" replace />}
            </ProtectedRoute>
          }
        />


        <Route
          path="/student/my-courses"
          element={
            <ProtectedRoute>
              <MyCourses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/attendance"
          element={
            <ProtectedRoute>
              <StudentAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/assignments"
          element={
            <ProtectedRoute>
              <Assignments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/grades"
          element={
            <ProtectedRoute>
              <MyGradesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/course/:id"
          element={
            <ProtectedRoute>
              <StudentCourseDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/course/:id/learning/:itemId"
          element={
            <ProtectedRoute>
              <StudentCourseDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>

      {user?.forcePasswordChange && (
        <ForcePasswordChangeModal
          visible={true}
          onSuccess={() => logout()} // Log out to force login with new password
        />
      )}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider theme={antTheme} locale={viVN}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SystemProvider>
            <AuthProvider>
              <SocketProvider>
                <AppRoutes />
              </SocketProvider>
            </AuthProvider>
          </SystemProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ConfigProvider>
  </QueryClientProvider>
);

export default App;
