/**
 * メール認証などで自己登録した生徒か（学校配布・教員は false）。
 * アカウント削除・表示名変更の UI 判定に共通利用。
 */
export function isSelfRegisteredStudentProfile(profile) {
  if (!profile) return false;
  if (profile.registrationType === 'school_provisioned') return false;
  if (profile.registrationType === 'self_registered') return true;
  if (profile.mustChangePassword === true) return false;
  if (
    profile.grade != null &&
    profile.class != null &&
    profile.number != null
  ) {
    return false;
  }
  return true;
}

/** 自己登録生徒がアプリ内からアカウント削除できるか（UI 用。最終判定は Cloud Functions）。 */
export function canDeleteSelfRegisteredAccount(profile) {
  return isSelfRegisteredStudentProfile(profile);
}

/** 自己登録生徒が表示名を変更できるか */
export function canEditSelfRegisteredDisplayName(profile) {
  return isSelfRegisteredStudentProfile(profile);
}
