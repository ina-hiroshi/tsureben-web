import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Header from './components/Header';
import Home from './pages/Home';
import StudyPlanPage from './pages/StudyPlanPage';
import StudyPomodoroPage from './pages/StudyPomodoroPage';
import StudyRecordPage from './pages/StudyRecordPage';
import TureBenMatePage from './pages/TureBenMatePage';
import SettingsPage from './pages/SettingsPage';

function AppLayout() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/studyplan" element={<StudyPlanPage />} />
      <Route path="/pomodoro" element={<StudyPomodoroPage />} />
      <Route path="/studyrecord" element={<StudyRecordPage />} />
      <Route path="/turebenmate" element={<TureBenMatePage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;