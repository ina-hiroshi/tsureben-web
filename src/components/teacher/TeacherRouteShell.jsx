import { Outlet } from 'react-router-dom';
import { TeacherWorkspaceProvider } from '../../contexts/TeacherWorkspaceContext';
import SchoolSelectionGate from './SchoolSelectionGate';

export default function TeacherRouteShell() {
  return (
    <TeacherWorkspaceProvider>
      <SchoolSelectionGate>
        <Outlet />
      </SchoolSelectionGate>
    </TeacherWorkspaceProvider>
  );
}
