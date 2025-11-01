'use client';

import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation, type Locale } from '@/lib/i18n';

export type Role = 'user' | 'agent' | 'admin';

interface RoleToggleProps {
  onRoleChange: (role: Role) => void;
  currentRole: Role;
  locale?: Locale;
}

export function RoleToggle({ onRoleChange, currentRole, locale = 'en' }: RoleToggleProps) {
  const t = useTranslation(locale);
  const router = useRouter();

  const handleRoleChange = (newRole: Role) => {
    onRoleChange(newRole);

    const roleRoutes = {
      user: '/help',
      agent: '/agent/inbox',
      admin: '/admin/dashboard',
    };

    router.push(roleRoutes[newRole]);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Role:</span>
      <Select value={currentRole} onValueChange={(value) => handleRoleChange(value as Role)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="user">{t.roles.user}</SelectItem>
          <SelectItem value="agent">{t.roles.agent}</SelectItem>
          <SelectItem value="admin">{t.roles.admin}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
