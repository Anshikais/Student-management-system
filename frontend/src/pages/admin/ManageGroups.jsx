import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  Users, 
  Search, 
  Eye, 
  Crown, 
  Mail, 
  IdCard, 
  Calendar, 
  Loader2, 
  X 
} from 'lucide-react';

export default function ManageGroups() {
  const toast = useToast();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Group Details Modal State
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/groups');
      if (res.data.success) {
        setGroups(res.data.data.groups || []);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
      toast.error('Failed to load groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const openGroupDetails = async (groupId) => {
    setLoadingDetails(true);
    try {
      const res = await api.get(`/groups/${groupId}`);
      if (res.data.success) {
        setSelectedGroup(res.data.data.group);
      }
    } catch (err) {
      console.error('Failed to load group details:', err);
      toast.error('Failed to load group details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.group_code.toLowerCase().includes(search.toLowerCase()) ||
    g.leader_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading student groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Manage Groups
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Monitor all registered student teams, leaders, and member distributions.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by group name, group code, or leader name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Groups Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Groups Found</h3>
            <p className="text-sm text-slate-500 mt-1">
              No registered student teams match your search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Group Name</th>
                  <th className="px-6 py-3.5">Group Code</th>
                  <th className="px-6 py-3.5">Group Leader</th>
                  <th className="px-6 py-3.5">Members</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((g) => {
                  const createdDate = new Date(g.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {g.name}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-indigo-600 font-semibold">
                        {g.group_code}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{g.leader_name}</div>
                        <div className="text-xs text-slate-500">{g.leader_email}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{g.member_count} Members</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {createdDate}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openGroupDetails(g.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Roster</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Group Details Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedGroup.name}</h3>
                <span className="font-mono text-xs font-semibold text-indigo-600">
                  {selectedGroup.group_code}
                </span>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Team Roster ({selectedGroup.members?.length || 0} Students)
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {selectedGroup.members?.map((m) => {
                  const isLeader = m.is_leader || m.user_id === selectedGroup.leader_id;
                  return (
                    <div key={m.user_id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {m.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <span>{m.name}</span>
                            {isLeader && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                <Crown className="w-3 h-3 text-amber-600" />
                                <span>Leader</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{m.email}</div>
                        </div>
                      </div>
                      <div className="font-mono text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                        {m.student_id || 'N/A'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}