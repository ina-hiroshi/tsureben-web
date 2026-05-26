export function getMateGroup(user) {
  return user?.schoolId ?? null;
}

export function canMateInteract(me, target) {
  if (!me || !target || me.email === target.email) return false;

  const myGroup = getMateGroup(me);
  const theirGroup = getMateGroup(target);
  const sameGroup = myGroup === theirGroup;

  if (me.mateScope === '学内外' || target.mateScope === '学内外') {
    if (sameGroup) return true;
    if (me.mateScope === '学内外' || target.mateScope === '学内外') return true;
  }

  return sameGroup;
}

export function normalizeNameLower(name) {
  return (name || '').trim().toLowerCase();
}
