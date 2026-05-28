import MateListItem from './MateListItem';

/**
 * 連れ勉ユーザー一覧（アプリ共通のカード型グリッド）
 */
export default function MateList({
  users,
  actions,
  emptyMessage = 'なし',
}) {
  if (!users.length) {
    return <p className="text-sm text-tsure-muted py-4 text-center">{emptyMessage}</p>;
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {users.map((user) => (
        <MateListItem key={user.email} user={user} actions={actions?.(user)} />
      ))}
    </ul>
  );
}
