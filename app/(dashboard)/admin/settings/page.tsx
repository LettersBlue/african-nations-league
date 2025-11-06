'use client';

import UserManagement from '@/components/admin/UserManagement';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminSettingsPage() {
  return (
    <AdminLayout activePage="settings">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">User Management</h1>
        <p className="text-gray-600">Manage user accounts and permissions</p>
      </div>
      
      <div className="space-y-6">
        <UserManagement />
      </div>
    </AdminLayout>
  );
}
