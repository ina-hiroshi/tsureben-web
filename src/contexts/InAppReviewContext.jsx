import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { useTeacherStatus } from '../hooks/useTeacherStatus';
import { useStudyTimerOptional } from './StudyTimerContext';
import { isIOSNative } from '../utils/platformAccess';
import { incrementReviewSessionCount } from '../utils/inAppReviewStorage';
import {
  setReviewPromptBlocked,
  setReviewPromptHandler,
} from '../services/inAppReviewService';

const InAppReviewContext = createContext(null);

const SESSION_COUNTED_PREFIX = 'tsureben_review_session_counted_';

export function InAppReviewProvider({ children }) {
  const { email } = useAuth();
  const { loading: teacherLoading } = useTeacherStatus();
  const timer = useStudyTimerOptional();
  const [reviewOpen, setReviewOpen] = useState(false);

  const stalePrompt = timer?.stalePrompt ?? null;

  useEffect(() => {
    if (!email || !isIOSNative() || teacherLoading) return;
    const sessionKey = `${SESSION_COUNTED_PREFIX}${email}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
    incrementReviewSessionCount(email);
  }, [email, teacherLoading]);

  useEffect(() => {
    setReviewPromptBlocked(Boolean(stalePrompt));
  }, [stalePrompt]);

  useEffect(() => {
    setReviewPromptHandler((reviewEmail) => {
      if (reviewEmail === email) setReviewOpen(true);
    });
    return () => setReviewPromptHandler(null);
  }, [email]);

  const closeReviewPrompt = useCallback(() => {
    setReviewOpen(false);
  }, []);

  const value = useMemo(
    () => ({ reviewOpen, closeReviewPrompt }),
    [reviewOpen, closeReviewPrompt]
  );

  return (
    <InAppReviewContext.Provider value={value}>{children}</InAppReviewContext.Provider>
  );
}

export function useInAppReview() {
  const ctx = useContext(InAppReviewContext);
  if (!ctx) {
    throw new Error('useInAppReview must be used within InAppReviewProvider');
  }
  return ctx;
}
