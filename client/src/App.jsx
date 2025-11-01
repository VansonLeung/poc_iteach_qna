import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// Admin Pages
import ActivityList from './pages/Admin/ActivityList';
import ActivityBuilder from './pages/Admin/ActivityBuilder';
import ActivityReport from './pages/Admin/ActivityReport';
import GradingInterface from './pages/Admin/GradingInterface';
import QuestionBuilder from './pages/Admin/QuestionBuilder';
import QuestionLibrary from './pages/Admin/QuestionLibrary';
import RubricList from './pages/Admin/RubricList';
import RubricBuilder from './pages/Admin/RubricBuilder';

// User Pages
import Dashboard from './pages/User/Dashboard';
import ActivityTaking from './pages/User/ActivityTaking';
import SubmissionHistory from './pages/User/SubmissionHistory';
import SubmissionScores from './pages/User/SubmissionScores';

// Shared Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import { Toaster } from './components/ui/toaster';

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          {/* Admin/Teacher routes */}
          <Route
            path="/admin/activities"
            element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ActivityList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activities/new"
            element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ActivityBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activities/:id/edit"
            element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ActivityBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/questions"
            element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <QuestionLibrary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/questions/new"
            element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <QuestionBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/questions/:id/edit"
            element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <QuestionBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rubrics"
            element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <RubricList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rubrics/new"
            element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <RubricBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rubrics/:id/edit"
            element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <RubricBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activities/:id/report"
            element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <ActivityReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activities/:activityId/grade"
            element={
              <ProtectedRoute roles={['admin', 'teacher']}>
                <GradingInterface />
              </ProtectedRoute>
            }
          />

          {/* User routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/activities/:id" element={<ActivityTaking />} />
          <Route path="/submissions" element={<SubmissionHistory />} />
          <Route path="/submissions/:id/scores" element={<SubmissionScores />} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
