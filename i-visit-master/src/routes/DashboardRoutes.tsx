import Accounts from '../pages/Accounts/Accounts';
import ActivityLogs from '../pages/ActivityLogs/ActivityLogs';
import InternalRegistration from '../pages/InternalRegistration/InternalRegistration';
import LogBook from '../pages/LogBook/LogBook';
import ScanIdPage from '../pages/ScanId/ScanIdPage';
import Stations from '../pages/Stations/Stations';
import Visitors from '../pages/Visitors/Visitors';
import LogVisitor from '../pages/LogVisitor/LogVisitor';
import ManagePasses from '../pages/ManagePasses/ManagePasses';
import ArchiveCenter from '../pages/ArchiveCenter/ArchiveCenter';
import DeviceSettings from '../pages/DeviceSettings/DeviceSettings';
import OcrTestPage from '../pages/OcrTest/OcrTestPage';

type Role = "admin" | "guard" | "support";

export interface DashboardRoute {
  type: Role[];
  label: string;
  path: string;
  element: React.ReactNode;
}

// OCR Test route - available to guards for testing OCR functionality
const ocrTestRoutes: DashboardRoute[] = [
  {
    type: ['guard'] as Role[],
    label: 'OCR Test',
    path: '/dashboard/ocr-test',
    element: <OcrTestPage />,
  },
];

const dashboardRoutes: DashboardRoute[] = [
  {
    type: ['guard', 'admin', 'support'],
    label: 'Activity Log',
    path: '/dashboard/activity-logs',
    element: <ActivityLogs />,
  },
  {
    type: ['admin', 'support'],
    label: 'Log Book',
    path: '/dashboard/logbook',
    element: <LogBook />,
  },
  {
    type: ['admin', 'support'],
    label: 'Visitors',
    path: '/dashboard/visitors',
    element: <Visitors />,
  },
  {
    type: ['admin'],
    label: 'Stations',
    path: '/dashboard/stations',
    element: <Stations />,
  },
  {
    type: ['admin', 'support'],
    label: 'Accounts',
    path: '/dashboard/accounts',
    element: <Accounts />,
  },
  {
    type: ['guard'],
    label: 'Scan Id',
    path: '/dashboard/scan-id',
    element: <ScanIdPage />,
  },
  {
    type: ['guard'],
    label: 'Log Visitor',
    path: '/dashboard/log-visitor',
    element: <LogVisitor />,
  },
  {
    type: ['admin'],
    label: 'Register Accounts',
    path: '/dashboard/register',
    element: <InternalRegistration />,
  },
  {
    type: ['admin'],
    label: 'Manage Passes',
    path: '/dashboard/manage-passes',
    element: <ManagePasses />,
  },
  {
    type: ['admin'],
    label: 'Archive Center',
    path: '/dashboard/archives',
    element: <ArchiveCenter />,
  },
  {
    type: ['admin'],
    label: 'Device Settings',
    path: '/dashboard/device-settings',
    element: <DeviceSettings />,
  },
  // Add OCR test routes at the end
  ...ocrTestRoutes,
];
export default dashboardRoutes;

