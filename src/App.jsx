import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AuthProvider } from './contexts/AuthContext';
import { UiFeedbackProvider } from './contexts/UiFeedbackContext';
import ProtectedRoute from './components/ProtectedRoute';
import { normalizeLocalhostOrigin } from './services/googleOAuth';
import Login from './pages/Login';
import OAuthCallback from './pages/OAuthCallback';
import Home from './pages/Home';
import StudyPlanPage from './pages/StudyPlanPage';
import StudyPomodoroPage from './pages/StudyPomodoroPage';
import StudyRecordPage from './pages/StudyRecordPage';
import TureBenMatePage from './pages/TureBenMatePage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';

function AppLayout() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/oauth-callback" element={<OAuthCallback />} />
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
            <StudyPomodoroPage />
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
    </Routes>
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
