'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getAllUsers, updateUserRole } from '@/app/actions/auth';
import {
  addVerifiedRepresentativeEmail,
  getVerifiedRepresentativeEmails,
  resendInvitationEmail,
  deleteVerifiedRepresentativeEmail,
} from '@/app/actions/representative-invitations';
import {
  addVerifiedAdminEmail,
  getVerifiedAdminEmails,
  resendAdminInvitationEmail,
  deleteVerifiedAdminEmail,
} from '@/app/actions/admin-invitations';
import { Role, AFRICAN_COUNTRIES } from '@/types';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [representatives, setRepresentatives] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adminUid, setAdminUid] = useState<string | null>(null);
  
  // Representative invitation form state
  const [newEmail, setNewEmail] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [addingInvitation, setAddingInvitation] = useState(false);
  
  // Admin invitation form state
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdminInvitation, setAddingAdminInvitation] = useState(false);

  useEffect(() => {
    // Get current user immediately if available
    const currentUser = auth.currentUser;
    if (currentUser) {
      setAdminUid(currentUser.uid);
    }
    
    // Also listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setAdminUid(firebaseUser.uid);
      } else {
        setAdminUid(null);
      }
    });
    
    loadUsers();
    loadRepresentatives();
    // Don't load admins here - wait for adminUid to be set
    
    return () => unsubscribe();
  }, []);

  // Load admins only after adminUid is confirmed (to filter out current user on server-side)
  useEffect(() => {
    if (adminUid) {
      loadAdmins();
    }
  }, [adminUid]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getAllUsers();
      if (result.success && result.users) {
        // Filter out duplicate users by UID
        const uniqueUsers = result.users.filter((user: any, index: number, self: any[]) => 
          index === self.findIndex((u: any) => u.uid === user.uid)
        );
        setUsers(uniqueUsers);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to load users' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: Role) => {
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await updateUserRole(userId, newRole);
      if (result.success) {
        setMessage({ type: 'success', text: 'User role updated successfully!' });
        await loadUsers();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update user role' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const loadRepresentatives = async () => {
    try {
      const result = await getVerifiedRepresentativeEmails();
      if (result.success && result.representatives) {
        setRepresentatives(result.representatives);
      }
    } catch (error: any) {
      console.error('Error loading representatives:', error);
    }
  };

  const loadAdmins = async () => {
    try {
      // Get current user UID to pass to server action
      const currentUser = auth.currentUser;
      const currentUid = currentUser?.uid || adminUid;
      
      // Only load admins if we have a UID (to ensure server-side filtering works)
      if (!currentUid) {
        return; // Wait for UID to be available
      }
      
      // Server-side filtering - pass the current admin UID
      const result = await getVerifiedAdminEmails(currentUid);
      if (result.success && result.admins) {
        setAdmins(result.admins);
      }
    } catch (error: any) {
      console.error('Error loading admins:', error);
    }
  };

  const handleAddRepresentative = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get adminUid from current user if not set yet
    let currentAdminUid = adminUid;
    if (!currentAdminUid) {
      // Try to get from auth.currentUser first
      const currentUser = auth.currentUser;
      if (currentUser) {
        currentAdminUid = currentUser.uid;
        setAdminUid(currentUser.uid);
      } else {
        // If still null, wait for auth state to be ready
        try {
          await new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
              unsubscribe();
              if (user) {
                currentAdminUid = user.uid;
                setAdminUid(user.uid);
              }
              resolve(undefined);
            });
            // If auth state resolves quickly, wait a bit
            setTimeout(() => {
              unsubscribe();
              resolve(undefined);
            }, 1000);
          });
        } catch (err) {
          console.error('Error waiting for auth:', err);
        }
        
        // Fallback: try to get from users list (admin user should be there)
        if (!currentAdminUid && users.length > 0) {
          const adminUser = users.find((u: any) => u.role === 'admin');
          if (adminUser) {
            currentAdminUid = adminUser.uid;
            setAdminUid(adminUser.uid);
          }
        }
      }
    }
    
    if (!currentAdminUid) {
      setMessage({ type: 'error', text: 'You must be logged in to add representatives. Please refresh the page and try again.' });
      return;
    }

    setAddingInvitation(true);
    setMessage(null);

    try {
      const result = await addVerifiedRepresentativeEmail(newEmail, newCountry, currentAdminUid);
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Invitation sent successfully!' });
        setNewEmail('');
        setNewCountry('');
        await loadRepresentatives();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send invitation' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setAddingInvitation(false);
    }
  };

  const handleResendInvitation = async (email: string) => {
    if (!window.confirm(`Resend invitation to ${email}?`)) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await resendInvitationEmail(email);
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Invitation resent successfully!' });
        await loadRepresentatives();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to resend invitation' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvitation = async (email: string) => {
    if (!window.confirm(`Delete invitation for ${email}? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await deleteVerifiedRepresentativeEmail(email);
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Invitation deleted successfully!' });
        await loadRepresentatives();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to delete invitation' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get adminUid from current user if not set yet
    let currentAdminUid = adminUid;
    if (!currentAdminUid) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        currentAdminUid = currentUser.uid;
        setAdminUid(currentUser.uid);
      } else {
        try {
          await new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
              unsubscribe();
              if (user) {
                currentAdminUid = user.uid;
                setAdminUid(user.uid);
              }
              resolve(undefined);
            });
            setTimeout(() => {
              unsubscribe();
              resolve(undefined);
            }, 1000);
          });
        } catch (err) {
          console.error('Error waiting for auth:', err);
        }
        
        if (!currentAdminUid && users.length > 0) {
          const adminUser = users.find((u: any) => u.role === 'admin');
          if (adminUser) {
            currentAdminUid = adminUser.uid;
            setAdminUid(adminUser.uid);
          }
        }
      }
    }
    
    if (!currentAdminUid) {
      setMessage({ type: 'error', text: 'You must be logged in to add admins. Please refresh the page and try again.' });
      return;
    }

    setAddingAdminInvitation(true);
    setMessage(null);

    try {
      const result = await addVerifiedAdminEmail(newAdminEmail, currentAdminUid);
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Invitation sent successfully!' });
        setNewAdminEmail('');
        await loadAdmins();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send invitation' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setAddingAdminInvitation(false);
    }
  };

  const handleResendAdminInvitation = async (email: string) => {
    if (!window.confirm(`Resend invitation to ${email}?`)) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await resendAdminInvitationEmail(email);
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Invitation resent successfully!' });
        await loadAdmins();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to resend invitation' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdminInvitation = async (email: string) => {
    if (!window.confirm(`Delete invitation for ${email}? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await deleteVerifiedAdminEmail(email);
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Invitation deleted successfully!' });
        await loadAdmins();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to delete invitation' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeClass = (role: Role) => {
    switch (role) {
      case 'admin':
        return 'badge badge-admin';
      case 'representative':
        return 'badge badge-representative';
      case 'visitor':
        return 'badge badge-visitor';
      default:
        return 'badge badge-visitor';
    }
  };

  return (
    <div className="space-y-6">
      {/* User Management Section */}
      <div className="card-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-quaternary">User Management</h2>
          <button
            onClick={() => {
              loadUsers();
              loadRepresentatives();
              loadAdmins();
            }}
            disabled={loading}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="table-container">
          <table className="table">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold">Name</th>
                <th className="text-left py-3 px-4 font-semibold">Email</th>
                <th className="text-left py-3 px-4 font-semibold">Current Role</th>
                <th className="text-left py-3 px-4 font-semibold">Country</th>
                <th className="text-left py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={`${user.uid}-${index}`} className="border-b border-gray-100">
                    <td className="py-3 px-4">{user.displayName}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={getRoleBadgeClass(user.role)}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {user.country || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleRoleUpdate(user.uid, 'admin')}
                            disabled={loading}
                            className="btn-primary-small"
                            title="Promote to Admin"
                          >
                            Make Admin
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitations Section - Two Cards Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Representative Invitations Card - Left */}
        <div className="card-sm">
          <h2 className="heading-quaternary mb-4">Representative Invitations</h2>
          
          {/* Add New Representative Form */}
          <div className="mb-6 p-4 glass rounded-lg">
            <h3 className="text-lg font-medium mb-3">Add New Representative</h3>
            <form onSubmit={handleAddRepresentative} className="space-y-4">
              <div>
                <label htmlFor="newEmail" className="label-field-sm">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="newEmail"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  disabled={addingInvitation}
                  className="input-field"
                  placeholder="representative@example.com"
                />
              </div>
              <div>
                <label htmlFor="newCountry" className="label-field-sm">
                  Country *
                </label>
                <select
                  id="newCountry"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  required
                  disabled={addingInvitation}
                  className="input-select"
                >
                  <option value="">Select country</option>
                  {AFRICAN_COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={addingInvitation || !newEmail.trim() || !newCountry}
                  className="btn-primary-full-width"
                >
                  {addingInvitation ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>

          {/* Representatives Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Country</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {representatives.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">
                      No representative invitations found
                    </td>
                  </tr>
                ) : (
                  representatives.map((rep, index) => (
                    <tr key={`${rep.uid}-${index}`} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-600">{rep.email}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{rep.country}</td>
                      <td className="py-3 px-4">
                        <span className={`badge ${
                          rep.pendingInvitation ? 'badge-pending' : 'badge-accepted'
                        }`}>
                          {rep.pendingInvitation ? 'Pending' : 'Accepted'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {rep.pendingInvitation && (
                            <>
                              <button
                                onClick={() => handleResendInvitation(rep.email)}
                                disabled={loading}
                                className="btn-primary-small"
                                title="Resend Invitation"
                              >
                                Resend
                              </button>
                              <button
                                onClick={() => handleDeleteInvitation(rep.email)}
                                disabled={loading}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:bg-gray-400"
                                title="Delete Invitation"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Admin Invitations Card - Right */}
        <div className="card-sm">
          <h2 className="heading-quaternary mb-4">Admin Invitations</h2>
          
          {/* Add New Admin Form */}
          <div className="mb-6 p-4 glass rounded-lg">
            <h3 className="text-lg font-medium mb-3">Add New Admin</h3>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label htmlFor="newAdminEmail" className="label-field-sm">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="newAdminEmail"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  required
                  disabled={addingAdminInvitation}
                  className="input-field"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={addingAdminInvitation || !newAdminEmail.trim()}
                  className="btn-primary-full-width"
                >
                  {addingAdminInvitation ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>

          {/* Admins Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-gray-500">
                      No admin invitations found
                    </td>
                  </tr>
                ) : (
                  admins.map((admin, index) => (
                    <tr key={`${admin.uid}-${index}`} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-600">{admin.email}</td>
                      <td className="py-3 px-4">
                        <span className={`badge ${
                          admin.pendingInvitation ? 'badge-pending' : 'badge-accepted'
                        }`}>
                          {admin.pendingInvitation ? 'Pending' : 'Accepted'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {admin.pendingInvitation && (
                            <>
                              <button
                                onClick={() => handleResendAdminInvitation(admin.email)}
                                disabled={loading}
                                className="btn-primary-small"
                                title="Resend Invitation"
                              >
                                Resend
                              </button>
                              <button
                                onClick={() => handleDeleteAdminInvitation(admin.email)}
                                disabled={loading}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:bg-gray-400"
                                title="Delete Invitation"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

