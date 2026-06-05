/** 学校配布アカウントの初回セットアップ（オンボーディング）が未完了か */
export function needsSchoolOnboarding(profile) {
  if (!profile || profile.registrationType !== 'school_provisioned') return false;
  if (profile.onboardingComplete === true) return false;
  // 既存ユーザー: フラグ未設定かつパスワード変更済みなら完了扱い
  if (profile.onboardingComplete == null && profile.mustChangePassword !== true) {
    return false;
  }
  return true;
}
