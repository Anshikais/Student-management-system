import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  ShieldCheck, 
  Copy, 
  Check, 
  Loader2, 
  Crown, 
  Mail, 
  IdCard,
  Plus
} from 'lucide-react';

export default function MyGroup() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Group Creation State (if student has no group)
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Add Member State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberIdentifier, setMemberIdentifier] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Remove Member State
  const [removingId, setRemovingId] = useState(null);

  const fetchGroup = async () => {
    try {
      setLoading(true);
      const res = await api.get('/groups');
      if (res.data.success) {
        setGroup(res.data.data.group);
      }
    } catch (err) {
      console.error('Failed to load group:', err);
      toast.error('Failed to load group information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
  }, []);

  const handleCopyCode = () => {
    if (group?.group_code) {
      navigator.clipboard.writeText(group.group_code);
      setCopied(true);
      toast.info('Group code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim() || newGroupName.trim().length < 3) {
      toast.error('Group name must be at least 3 characters.');
      return;
    }

    setIsCreatingGroup(true);
    try {
      const res = await api.post('/groups', { name: newGroupName.trim() });
      if (res.data.success) {
        toast.success(`Group "${res.data.data.group.name}" created successfully!`);
        await fetchGroup();
        await refreshUser();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create group';
      toast.error(msg);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberIdentifier.trim()) {
      toast.error('Please enter a student email or student ID.');
      return;
    }

    setIsAddingMember(true);
    try {
      const res = await api.post(`/groups/${group.id}/members`, {
        identifier: memberIdentifier.trim()
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Member added successfully!');
        setMemberIdentifier('');
        setIsAddModalOpen(false);
        await fetchGroup();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add member';
      toast.error(msg);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (targetUserId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the group?`)) {
      return;
    }

    setRemovingId(targetUserId);
    try {
      const res = await api.delete(`/groups/${group.id}/members/${targetUserId}`);
      if (res.data.success) {
        toast.success(`Removed ${memberName} from the group.`);
        await fetchGroup();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to remove member';
      toast.error(msg);
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading group details...</p>
        </div>
      </div>
    );
  }

  const isLeader = group?.is_leader || group?.leader_id === user?.id;

  // Unassigned Student View
  if (!group) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-200">
        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">You Are Not in a Group Yet</h2>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            You need to be in a group to complete team assignments and track submissions. You can create your own group below or ask your group leader to add you using your Student ID (<span className="font-mono font-semibold text-slate-800">{user?.student_id}</span>).
          </p>

          <form onSubmit={handleCreateGroup} className="mt-8 max-w-md mx-auto space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                New Group Name
              </label>
              <input
                type="text"
                required
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Cyber Pioneers, Team Apex"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isCreatingGroup}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-500/20 disabled:opacity-50 transition-all"
            >
              {isCreatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Create Group & Become Leader</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Group Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <span>Team Overview</span>
            <span>•</span>
            <span>{group.members?.length || 0} Members</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>{group.name}</span>
            {isLeader && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>You are Leader</span>
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Leader: <span className="font-medium text-slate-800">{group.leader_name}</span> ({group.leader_email})
          </p>
        </div>

        {/* Group Code Card */}
        <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Group Code</div>
            <div className="text-base font-mono font-bold text-slate-900">{group.group_code}</div>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-200/70 rounded-lg transition-colors"
            title="Copy Group Code"
          >
            {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Members Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Group Members</h2>
            <p className="text-xs text-slate-500 mt-0.5">Students collaborating in this group</p>
          </div>

          {isLeader && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Student</th>
                <th className="px-6 py-3.5">Student ID</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Role</th>
                {isLeader && <th className="px-6 py-3.5 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {group.members?.map((m) => {
                const isGroupLeader = m.is_leader || m.user_id === group.leader_id;
                const isCurrentUser = m.user_id === user.id;

                return (
                  <tr key={m.user_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs shrink-0">
                        {m.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <span>{m.name}</span>
                        {isCurrentUser && (
                          <span className="ml-2 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      {m.student_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {m.email}
                    </td>
                    <td className="px-6 py-4">
                      {isGroupLeader ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Crown className="w-3 h-3 text-amber-600" />
                          <span>Leader</span>
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Member
                        </span>
                      )}
                    </td>
                    {isLeader && (
                      <td className="px-6 py-4 text-right">
                        {!isGroupLeader && (
                          <button
                            onClick={() => handleRemoveMember(m.user_id, m.name)}
                            disabled={removingId === m.user_id}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove Member"
                          >
                            {removingId === m.user_id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Member to Group</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the student's registered email address or student ID.
            </p>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Email or Student ID
                </label>
                <input
                  type="text"
                  required
                  value={memberIdentifier}
                  onChange={(e) => setMemberIdentifier(e.target.value)}
                  placeholder="e.g. alice@joineazy.edu or STU-1003"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isAddingMember}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingMember}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
                >
                  {isAddingMember && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Add Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}