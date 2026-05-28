import MateListItem from './MateListItem';
import EmptyState from './ui/EmptyState';

/**
 * 連れ勉ユーザー一覧（アプリ共通のカード型グリッド）
 */
export default function MateList({ users, actions, emptyState, emptyAction }) {
  if (!users.length) {
    return <EmptyState {...emptyState} action={emptyAction} />;
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {users.map((user) => (
        <MateListItem key={user.email} user={user} actions={actions?.(user)} />
      ))}
    </ul>
  );
}
