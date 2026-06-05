import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

const functions = getFunctions(app, 'asia-northeast1');

function formatCallableError(err) {
  const code = err?.code?.replace?.('functions/', '') || '';
  const detail = err?.details || err?.message || 'リクエストに失敗しました';
  if (code === 'failed-precondition') return detail;
  if (code === 'permission-denied') return detail;
  return detail;
}

async function call(name, data) {
  try {
    const fn = httpsCallable(functions, name);
    const res = await fn(data);
    return res.data;
  } catch (err) {
    console.error(`Cloud Function ${name} failed:`, err);
    throw new Error(formatCallableError(err));
  }
}

export const createCheckoutSession = (payload) => call('createCheckoutSession', payload);

export const claimBillingSchoolAdmin = () => call('claimBillingSchoolAdmin', {});

export const createBillingPortalSession = (payload) =>
  call('createBillingPortalSession', payload);

export const adminListSchoolBilling = () => call('adminListSchoolBilling', {});

export const createLegacyFreeSchool = (payload) => call('createLegacyFreeSchool', payload);
