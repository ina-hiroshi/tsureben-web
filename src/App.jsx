import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AuthProvider } from './contexts/AuthContext';
import { AdProvider } from './contexts/AdContext';
import { StudyTimerProvider } from './contexts/StudyTimerContext';
import { UiFeedbackProvider } from './contexts/UiFeedbackContext';
import ProtectedRoute from './components/ProtectedRoute';
import { normalizeLocalhostOrigin } from './services/googleOAuth';
import Login from './pages/Login';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import OAuthCallback from './pages/OAuthCallback';
import Home from './pages/Home';
import StudyPlanPage from './pages/StudyPlanPage';
import StudyTimerPage from './pages/StudyTimerPage';
import StudyRecordPage from './pages/StudyRecordPage';
import TureBenMatePage from './pages/TureBenMatePage';
import MateInvitePage from './pages/MateInvitePage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import AdminTeacherCommentsPage from './pages/AdminTeacherCommentsPage';
import TeacherStudentReviewPage from './pages/TeacherStudentReviewPage';
import TeacherLivePresencePage from './pages/TeacherLivePresencePage';
import TeacherRouteShell from './components/teacher/TeacherRouteShell';
import StudentFeedbackPage from './pages/StudentFeedbackPage';
import DemoSettingsAccessSync from './components/dev/DemoSettingsAccessSync';
import StudyTimerStalePrompt from './components/StudyTimerStalePrompt';

function AppLayout() {
  return (
    <>
      <DemoSettingsAccessSync />
      <StudyTimerStalePrompt />
      <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/oauth-callback" element={<OAuthCallback />} />
      <Route path="/mate-invite/:token" element={<MateInvitePage />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute blockSelfRegisteredOnWeb>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/studyplan"
        element={
          <ProtectedRoute blockSelfRegisteredOnWeb>
            <StudyPlanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pomodoro"
        element={
          <ProtectedRoute blockSelfRegisteredOnWeb>
            <StudyTimerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/studyrecord"
        element={
          <ProtectedRoute blockSelfRegisteredOnWeb>
            <StudyRecordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/turebenmate"
        element={
          <ProtectedRoute blockSelfRegisteredOnWeb>
            <TureBenMatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute blockSelfRegisteredOnWeb>
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
        path="/admin/teacher-comments"
        element={
          <ProtectedRoute requireSchoolAdmin>
            <AdminTeacherCommentsPage />
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
          <ProtectedRoute blockSelfRegisteredOnWeb>
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

  // iOS の Google ログイン初期化。
  // codetrix プラグインの iOS 実装は load() が空で、initialize() を呼ばないと
  // 内部の GIDSignIn(googleSignIn) が nil のままになり、signIn 時に nil 強制
  // アンラップでクラッシュする。clientId/scopes は capacitor.config.json の
  // iosClientId から解決されるため、ネイティブブリッジ経由で初期化しておく。
  // （以前の external 指定 JS import 経由の init は解決失敗で機能しなかった）
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const GoogleAuth = window.Capacitor?.Plugins?.GoogleAuth;
    if (GoogleAuth?.initialize) {
      Promise.resolve(
        GoogleAuth.initialize({
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        })
      ).catch((err) => console.error('GoogleAuth initialize error:', err));
    }
  }, []);

  return (
    <AuthProvider>
      <AdProvider>
        <StudyTimerProvider>
          <UiFeedbackProvider>
            <Router>
              <AppLayout />
            </Router>
          </UiFeedbackProvider>
        </StudyTimerProvider>
      </AdProvider>
    </AuthProvider>
  );
}

export default App;
