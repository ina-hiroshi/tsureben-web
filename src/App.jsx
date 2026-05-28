import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AuthProvider } from './contexts/AuthContext';
import { UiFeedbackProvider } from './contexts/UiFeedbackContext';
import ProtectedRoute from './components/ProtectedRoute';
import { normalizeLocalhostOrigin } from './services/googleOAuth';
import Login from './pages/Login';
import OAuthCallback from './pages/OAuthCallback';
import Home from './pages/Home';
import StudyPlanPage from './pages/StudyPlanPage';
import StudyTimerPage from './pages/StudyTimerPage';
import StudyRecordPage from './pages/StudyRecordPage';
import TureBenMatePage from './pages/TureBenMatePage';
import MateInvitePage from './pages/MateInvitePage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import TeacherStudentReviewPage from './pages/TeacherStudentReviewPage';
import TeacherLivePresencePage from './pages/TeacherLivePresencePage';
import TeacherRouteShell from './components/teacher/TeacherRouteShell';
import StudentFeedbackPage from './pages/StudentFeedbackPage';
import DemoSettingsAccessSync from './components/dev/DemoSettingsAccessSync';

function AppLayout() {
  return (
    <>
      <DemoSettingsAccessSync />
      <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/oauth-callback" element={<OAuthCallback />} />
      <Route path="/mate-invite/:token" element={<MateInvitePage />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/studyplan"
        element={
          <ProtectedRoute>
            <StudyPlanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pomodoro"
        element={
          <ProtectedRoute>
            <StudyTimerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/studyrecord"
        element={
          <ProtectedRoute>
            <StudyRecordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/turebenmate"
        element={
          <ProtectedRoute>
            <TureBenMatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireSchoolAdmin>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher"
        element={
          <ProtectedRoute requireTeacher>
            <TeacherRouteShell>
              <Navigate to="/teacher/live" replace />
            </TeacherRouteShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/live"
        element={
          <ProtectedRoute requireTeacher>
            <TeacherRouteShell>
              <TeacherLivePresencePage />
            </TeacherRouteShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/students"
        element={
          <ProtectedRoute requireTeacher>
            <TeacherRouteShell>
              <TeacherStudentReviewPage />
            </TeacherRouteShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/feedback"
        element={
          <ProtectedRoute>
            <StudentFeedbackPage />
          </ProtectedRoute>
        }
      />
    </Routes>
    </>
  );
}

function App() {
  useEffect(() => {
    normalizeLocalhostOrigin();
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@codetrix-studio/capacitor-google-auth')
        .then(({ GoogleAuth }) => {
          GoogleAuth.init({
            clientId: WEB_CLIENT_ID,
            scopes: ['profile', 'email'],
            grantOfflineAccess: true,
          });
        })
        .catch((err) => {
          console.error('GoogleAuth init error:', err);
        });
    }
  }, []);

  return (
    <AuthProvider>
      <UiFeedbackProvider>
        <Router>
          <AppLayout />
        </Router>
      </UiFeedbackProvider>
    </AuthProvider>
  );
}

const WEB_CLIENT_ID =
  '77789669140-61nhedsb0v3i2qsthnsq0pm7nba0ahkr.apps.googleusercontent.com';

export default App;
