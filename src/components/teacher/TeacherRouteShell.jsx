import { TeacherWorkspaceProvider } from '../../contexts/TeacherWorkspaceContext';
import SchoolSelectionGate from './SchoolSelectionGate';

export default function TeacherRouteShell({ children }) {
  return (
    <TeacherWorkspaceProvider>
      <SchoolSelectionGate>{children}</SchoolSelectionGate>
    </TeacherWorkspaceProvider>
  );
}
