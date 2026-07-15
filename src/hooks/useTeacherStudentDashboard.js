import { useEffect, useState } from 'react';
import { getRecentStudyDetail } from '../services/firestore/logService';
import { fetchThreadsForStudent } from '../services/firestore/feedbackService';
import { summarizeFeedbackThreads } from '../utils/teacherStudentStatus';

const RECENT_STUDY_DAYS = 7;

export function useTeacherStudentDashboard(studentEmail) {
  const [loading, setLoading] = useState(false);
  const [studyDetail, setStudyDetail] = useState(null);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentEmail) {
      setStudyDetail(null);
      setFeedbackSummary(null);
      setError(null);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getRecentStudyDetail(studentEmail, RECENT_STUDY_DAYS),
      fetchThreadsForStudent(studentEmail),
    ])
      .then(([study, threads]) => {
        if (!active) return;
        setStudyDetail(study);
        setFeedbackSummary(summarizeFeedbackThreads(threads));
      })
      .catch((err) => {
        console.error('Failed to load student dashboard data:', err);
        if (active) {
          setStudyDetail(null);
          setFeedbackSummary(null);
          setError(err);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [studentEmail]);

  return {
    loading,
    studyDetail,
    feedbackSummary,
    error,
    recentStudyDays: RECENT_STUDY_DAYS,
  };
}
