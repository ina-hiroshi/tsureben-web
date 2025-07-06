import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Header from './components/Header';
import Home from './pages/Home';
import StudyPlanPage from './pages/StudyPlanPage';
import StudyPomodoroPage from './pages/StudyPomodoroPage'; // ← 追加

function AppLayout() {
  const location = useLocation();
  const hideHeaderOnPaths = ['/', '/login'];

  const shouldShowHeader = !hideHeaderOnPaths.includes(location.pathname);

  return (
    <>
      {shouldShowHeader && <Header />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/studyplan" element={<StudyPlanPage />} />
        <Route path="/pomodoro" element={<StudyPomodoroPage />} /> {/* ← 追加 */}
      </Routes>
    </>
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