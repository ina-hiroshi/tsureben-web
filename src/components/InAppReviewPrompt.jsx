import { useAuth } from '../contexts/AuthContext';
import { useInAppReview } from '../contexts/InAppReviewContext';
import {
  recordReviewDeclined,
  recordReviewPostponed,
  recordReviewPromptShown,
} from '../utils/inAppReviewStorage';
import { requestNativeReview } from '../services/inAppReviewService';
import Modal from './ui/Modal';
import Button from './ui/Button';

export default function InAppReviewPrompt() {
  const { email } = useAuth();
  const { reviewOpen, closeReviewPrompt } = useInAppReview();

  if (!reviewOpen || !email) return null;

  const handleYes = async () => {
    recordReviewPromptShown(email);
    closeReviewPrompt();
    await requestNativeReview();
  };

  const handleLater = () => {
    recordReviewPostponed(email);
    closeReviewPrompt();
  };

  const handleNo = () => {
    recordReviewDeclined(email);
    closeReviewPrompt();
  };

  return (
    <Modal
      open
      onClose={handleLater}
      title="連れ勉はお役に立っていますか？"
      fullScreenMobile={false}
    >
      <p className="text-sm text-tsure-primary leading-relaxed mb-6">
        よろしければ、App Store での評価にご協力ください。ご意見は今後の改善に役立てます。
      </p>
      <div className="flex flex-col gap-3">
        <Button variant="accent" className="w-full" onClick={handleYes}>
          はい、評価する
        </Button>
        <Button variant="secondary" className="w-full" onClick={handleLater}>
          あとで
        </Button>
        <Button variant="secondary" className="w-full" onClick={handleNo}>
          いいえ
        </Button>
      </div>
    </Modal>
  );
}
