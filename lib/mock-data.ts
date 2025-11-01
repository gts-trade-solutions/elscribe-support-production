export type DeviceOS = 'Windows 11' | 'Windows 10' | 'macOS Sonoma' | 'macOS Ventura' | 'iOS 17' | 'Android 14' | 'Ubuntu 22.04';
export type DeviceType = 'Desktop' | 'Laptop' | 'Smartphone' | 'Tablet';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type UserRole = 'user' | 'agent' | 'admin';
export type DeviceHealth = 'healthy' | 'warning' | 'critical' | 'offline';
export type EventType = 'created' | 'status_change' | 'step_completed' | 'step_failed' | 'escalation_requested' | 'agent_note' | 'agent_assigned' | 'user_response' | 'agent_response';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  lastActive: string;
  deviceIds: string[];
}

export interface Device {
  id: string;
  type: DeviceType;
  os: DeviceOS;
  osVersion: string;
  owner: string;
  ownerId: string;
  health: DeviceHealth;
  lastSeen: string;
  memory: string;
  cores: number;
  storage: {
    total: string;
    used: string;
    percentage: number;
  };
  battery?: number;
  updatesPending: number;
}

export interface TicketEvent {
  id: string;
  type: EventType;
  timestamp: string;
  actor: string;
  actorId: string;
  content: string;
  metadata?: {
    oldValue?: string;
    newValue?: string;
    stepId?: string;
    severity?: string;
  };
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  userId: string;
  userName: string;
  userEmail: string;
  deviceId: string;
  agentId?: string;
  agentName?: string;
  created: string;
  lastUpdate: string;
  slaDeadline: string;
  slaStatus: 'on-track' | 'at-risk' | 'breached';
  tags: string[];
  timeline: TicketEvent[];
  stepsAttempted: string[];
  artifacts: string[];
}

export interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  risk: 'low' | 'medium' | 'high';
  rollback?: string;
  command?: string;
  completed: boolean;
}

export interface KBArticle {
  id: string;
  title: string;
  description: string;
  body: string;
  category: string;
  tags: string[];
  version: string;
  lastUpdated: string;
  views: number;
  confidence: number;
  citations: {
    title: string;
    source: string;
    url: string;
  }[];
}

export interface Playbook {
  id: string;
  title: string;
  category: string;
  steps: string[];
  estimatedTime: number;
  successRate: number;
}

export interface Script {
  id: string;
  name: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  requiresApproval: boolean;
  rollbackSteps: string[];
  command: string;
}

export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Sarah Johnson',
    email: 'sarah.j@company.com',
    role: 'agent',
    status: 'active',
    lastActive: '2 hours ago',
    deviceIds: ['dev-2'],
  },
  {
    id: 'user-2',
    name: 'Mike Chen',
    email: 'mike.c@company.com',
    role: 'agent',
    status: 'active',
    lastActive: '1 hour ago',
    deviceIds: ['dev-3'],
  },
  {
    id: 'user-3',
    name: 'Emily Davis',
    email: 'emily.d@company.com',
    role: 'admin',
    status: 'active',
    lastActive: '30 mins ago',
    deviceIds: ['dev-4'],
  },
  {
    id: 'user-4',
    name: 'John Smith',
    email: 'john.s@company.com',
    role: 'user',
    status: 'active',
    lastActive: '5 mins ago',
    deviceIds: ['dev-1'],
  },
  {
    id: 'user-5',
    name: 'Rachel Green',
    email: 'rachel.g@company.com',
    role: 'user',
    status: 'active',
    lastActive: '30 mins ago',
    deviceIds: ['dev-5'],
  },
];

export const mockDevices: Device[] = [
  {
    id: 'dev-1',
    type: 'Desktop',
    os: 'Windows 11',
    osVersion: '23H2',
    owner: 'John Smith',
    ownerId: 'user-4',
    health: 'healthy',
    lastSeen: '5 mins ago',
    memory: '16GB',
    cores: 8,
    storage: { total: '512GB', used: '256GB', percentage: 50 },
    updatesPending: 0,
  },
  {
    id: 'dev-2',
    type: 'Laptop',
    os: 'macOS Sonoma',
    osVersion: '14.1.2',
    owner: 'Sarah Johnson',
    ownerId: 'user-1',
    health: 'healthy',
    lastSeen: '1 hour ago',
    memory: '32GB',
    cores: 10,
    storage: { total: '1TB', used: '720GB', percentage: 72 },
    battery: 85,
    updatesPending: 1,
  },
  {
    id: 'dev-3',
    type: 'Smartphone',
    os: 'iOS 17',
    osVersion: '17.2.1',
    owner: 'Mike Chen',
    ownerId: 'user-2',
    health: 'warning',
    lastSeen: '2 hours ago',
    memory: '8GB',
    cores: 6,
    storage: { total: '256GB', used: '245GB', percentage: 96 },
    battery: 42,
    updatesPending: 0,
  },
  {
    id: 'dev-4',
    type: 'Laptop',
    os: 'Windows 11',
    osVersion: '22H2',
    owner: 'Emily Davis',
    ownerId: 'user-3',
    health: 'warning',
    lastSeen: '30 mins ago',
    memory: '16GB',
    cores: 8,
    storage: { total: '512GB', used: '480GB', percentage: 94 },
    battery: 28,
    updatesPending: 5,
  },
  {
    id: 'dev-5',
    type: 'Desktop',
    os: 'Ubuntu 22.04',
    osVersion: '22.04.3 LTS',
    owner: 'Rachel Green',
    ownerId: 'user-5',
    health: 'healthy',
    lastSeen: '30 mins ago',
    memory: '32GB',
    cores: 16,
    storage: { total: '2TB', used: '800GB', percentage: 40 },
    updatesPending: 2,
  },
];

export const mockTickets: Ticket[] = [
  {
    id: 'TKT-1001',
    title: 'WiFi keeps disconnecting on MacBook Pro',
    description: 'My WiFi connection drops every few minutes. I have to manually reconnect each time.',
    status: 'open',
    priority: 'high',
    category: 'Network',
    userId: 'user-4',
    userName: 'John Smith',
    userEmail: 'john.s@company.com',
    deviceId: 'dev-2',
    agentId: 'user-1',
    agentName: 'Sarah Johnson',
    created: '2 hours ago',
    lastUpdate: '30 mins ago',
    slaDeadline: 'in 1.5 hours',
    slaStatus: 'on-track',
    tags: ['network', 'wifi', 'macOS'],
    stepsAttempted: ['Restarted router', 'Checked WiFi settings', 'Forgot and rejoined network'],
    artifacts: ['system-log.txt', 'wifi-diagnostics.png'],
    timeline: [
      {
        id: 'evt-1',
        type: 'created',
        timestamp: '2 hours ago',
        actor: 'John Smith',
        actorId: 'user-4',
        content: 'My WiFi connection drops every few minutes. I have to manually reconnect each time.',
      },
      {
        id: 'evt-2',
        type: 'agent_assigned',
        timestamp: '1 hour 45 mins ago',
        actor: 'System',
        actorId: 'system',
        content: 'Ticket assigned to Sarah Johnson',
      },
      {
        id: 'evt-3',
        type: 'agent_response',
        timestamp: '1 hour ago',
        actor: 'Sarah Johnson',
        actorId: 'user-1',
        content: 'Thank you for reporting this. Can you tell me which version of macOS you\'re running?',
      },
      {
        id: 'evt-4',
        type: 'user_response',
        timestamp: '50 mins ago',
        actor: 'John Smith',
        actorId: 'user-4',
        content: 'I\'m on macOS Sonoma 14.1.2',
      },
      {
        id: 'evt-5',
        type: 'step_completed',
        timestamp: '45 mins ago',
        actor: 'John Smith',
        actorId: 'user-4',
        content: 'Completed: Reset network settings',
        metadata: { stepId: 'step-1' },
      },
      {
        id: 'evt-6',
        type: 'agent_note',
        timestamp: '30 mins ago',
        actor: 'Sarah Johnson',
        actorId: 'user-1',
        content: 'User has tried basic troubleshooting. Checking for driver updates next.',
      },
    ],
  },
  {
    id: 'TKT-0998',
    title: 'Unable to install printer drivers',
    description: 'HP LaserJet Pro M404dn driver installation fails with error code 0x80070002.',
    status: 'in_progress',
    priority: 'medium',
    category: 'Hardware',
    userId: 'user-5',
    userName: 'Rachel Green',
    userEmail: 'rachel.g@company.com',
    deviceId: 'dev-5',
    agentId: 'user-2',
    agentName: 'Mike Chen',
    created: '1 day ago',
    lastUpdate: '3 hours ago',
    slaDeadline: 'in 20 hours',
    slaStatus: 'on-track',
    tags: ['hardware', 'printer', 'drivers'],
    stepsAttempted: ['Downloaded drivers from HP website', 'Ran Windows Update', 'Checked USB connection'],
    artifacts: ['error-screenshot.png', 'device-manager.png'],
    timeline: [
      {
        id: 'evt-7',
        type: 'created',
        timestamp: '1 day ago',
        actor: 'Rachel Green',
        actorId: 'user-5',
        content: 'HP LaserJet Pro M404dn driver installation fails with error code 0x80070002.',
      },
      {
        id: 'evt-8',
        type: 'status_change',
        timestamp: '23 hours ago',
        actor: 'Mike Chen',
        actorId: 'user-2',
        content: 'Status changed from open to in_progress',
        metadata: { oldValue: 'open', newValue: 'in_progress' },
      },
      {
        id: 'evt-9',
        type: 'step_failed',
        timestamp: '20 hours ago',
        actor: 'Rachel Green',
        actorId: 'user-5',
        content: 'Failed: Clean printer driver installation',
        metadata: { stepId: 'step-2' },
      },
      {
        id: 'evt-10',
        type: 'escalation_requested',
        timestamp: '3 hours ago',
        actor: 'Mike Chen',
        actorId: 'user-2',
        content: 'Escalated to senior support team for driver signing issue',
        metadata: { severity: 'medium' },
      },
    ],
  },
];

export const mockChecklistSteps: ChecklistStep[] = [
  {
    id: 'step-1',
    title: 'Verify WiFi is enabled',
    description: 'Check that WiFi adapter is turned on in system settings',
    estimatedMinutes: 1,
    risk: 'low',
    completed: false,
  },
  {
    id: 'step-2',
    title: 'Restart WiFi router',
    description: 'Power cycle your router by unplugging for 30 seconds',
    estimatedMinutes: 3,
    risk: 'low',
    rollback: 'Router will automatically restart when plugged back in',
    completed: false,
  },
  {
    id: 'step-3',
    title: 'Update network drivers',
    description: 'Check for and install the latest network adapter drivers',
    estimatedMinutes: 5,
    risk: 'medium',
    command: 'Open Device Manager > Network adapters > Update driver',
    rollback: 'Roll back driver in Device Manager if issues occur',
    completed: false,
  },
  {
    id: 'step-4',
    title: 'Reset network settings',
    description: 'Reset all network configurations to defaults',
    estimatedMinutes: 5,
    risk: 'medium',
    command: 'Settings > Network > Advanced > Reset network settings',
    rollback: 'You will need to rejoin WiFi networks and re-enter passwords',
    completed: false,
  },
  {
    id: 'step-5',
    title: 'Flush DNS cache',
    description: 'Clear DNS resolver cache to fix potential DNS issues',
    estimatedMinutes: 2,
    risk: 'low',
    command: 'ipconfig /flushdns',
    completed: false,
  },
];

export const mockKBArticles: KBArticle[] = [
  {
    id: 'kb-1',
    title: 'How to Fix WiFi Connection Issues on Windows',
    description: 'Step-by-step guide to troubleshoot and resolve common WiFi problems.',
    body: 'Full article content here...',
    category: 'Network',
    tags: ['wifi', 'network', 'windows', 'troubleshooting'],
    version: '2.1',
    lastUpdated: 'October 15, 2025',
    views: 1243,
    confidence: 92,
    citations: [
      {
        title: 'Fix WiFi connection issues in Windows',
        source: 'Microsoft Support',
        url: 'https://support.microsoft.com/en-us/windows/fix-wi-fi-connection-issues-in-windows',
      },
      {
        title: 'Troubleshooting WiFi connectivity',
        source: 'Intel',
        url: 'https://www.intel.com/content/www/us/en/support/articles/000005489/wireless.html',
      },
    ],
  },
  {
    id: 'kb-2',
    title: 'MacBook Battery Draining Fast - Solutions',
    description: 'Learn how to optimize battery life and identify power-hungry apps.',
    body: 'Full article content here...',
    category: 'Hardware',
    tags: ['battery', 'macbook', 'macos', 'performance'],
    version: '1.5',
    lastUpdated: 'October 20, 2025',
    views: 892,
    confidence: 88,
    citations: [
      {
        title: 'Maximize battery life on your Mac notebook',
        source: 'Apple Support',
        url: 'https://support.apple.com/en-us/HT201585',
      },
    ],
  },
];

export const mockPlaybooks: Playbook[] = [
  {
    id: 'pb-1',
    title: 'WiFi Connectivity Troubleshooting',
    category: 'Network',
    steps: [
      'Verify WiFi is enabled',
      'Check airplane mode status',
      'Restart router and modem',
      'Update network drivers',
      'Reset network settings',
      'Check for interference',
    ],
    estimatedTime: 15,
    successRate: 87,
  },
  {
    id: 'pb-2',
    title: 'Printer Driver Installation',
    category: 'Hardware',
    steps: [
      'Uninstall existing drivers',
      'Download latest drivers from manufacturer',
      'Run as administrator',
      'Restart print spooler service',
      'Test print',
    ],
    estimatedTime: 10,
    successRate: 92,
  },
];

export const mockScripts: Script[] = [
  {
    id: 'script-1',
    name: 'Network Diagnostic',
    description: 'Comprehensive network connectivity check',
    risk: 'low',
    requiresApproval: false,
    rollbackSteps: ['No system changes made - read-only diagnostic'],
    command: 'ipconfig /all && netstat -an && ping 8.8.8.8',
  },
  {
    id: 'script-2',
    name: 'Reset DNS Cache',
    description: 'Clear DNS resolver cache',
    risk: 'low',
    requiresApproval: true,
    rollbackSteps: ['DNS cache will rebuild automatically'],
    command: 'ipconfig /flushdns',
  },
  {
    id: 'script-3',
    name: 'Reset Network Stack',
    description: 'Complete network configuration reset',
    risk: 'high',
    requiresApproval: true,
    rollbackSteps: [
      'Restore network settings from backup',
      'Manually reconfigure IP settings',
      'Rejoin WiFi networks',
    ],
    command: 'netsh winsock reset && netsh int ip reset',
  },
];
