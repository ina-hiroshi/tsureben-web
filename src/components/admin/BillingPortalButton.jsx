import { useState } from 'react';
import { createBillingPortalSession } from '../../services/billingApi';
import { useUiFeedback } from '../../contexts/UiFeedbackContext';
import LoadingOverlay from '../ui/LoadingOverlay';

export default function BillingPortalButton({ schoolId, className = '' }) {
  const { toast } = useUiFeedback();
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setLoading(true);
    try {
      const { url } = await createBillingPortalSession(schoolId ? { schoolId } : {});
      if (!url) throw new Error('ポータル URL を取得できませんでした');
      window.location.href = url;
    } catch (err) {
      toast.error(err.message || '請求ポータルを開けませんでした');
      setLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay open={loading} label="請求ポータルを開いています..." />
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className={
          className ||
          'inline-flex px-4 py-2 text-sm rounded-lg border border-[#5a3e28] text-[#5a3e28] hover:bg-white disabled:opacity-50'
        }
      >
        契約・請求管理（Stripe）
      </button>
    </>
  );
}
