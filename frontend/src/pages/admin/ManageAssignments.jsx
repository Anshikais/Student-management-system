import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Loader2, 
  X,
  Search
} from 'lucide-react';

export default function ManageAssignments() {
  const toast = useToast();

  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State (Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    onedrive_link: '',
    allocation_type: 'all', // 'all' | 'groups'
    group_ids: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignRes, groupsRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/groups')
      ]);

      if (assignRes.data.success) {
        setAssignments(assignRes.data.data.assignments || []);
      }
      if (groupsRes.data.success) {
        setGroups(groupsRes.data.data.groups || []);
      }
    } catch (err) {
      console.error('Failed to load assignments or groups:', err);
      toast.error('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingAssignment(null);
    setFormData({
      title: '',
      description: '',
      due_date: '',
      onedrive_link: '',
      allocation_type: 'all',
      group_ids: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (assign) => {
    setEditingAssignment(assign);
    const formattedDueDate = assign.due_date 
      ? new Date(assign.due_date).toISOString().slice(0, 16) 
      : '';

    setFormData({
      title: assign.title,
      description: assign.description,
      due_date: formattedDueDate,
      onedrive_link: assign.onedrive_link,
      allocation_type: assign.allocation_type === 'groups' ? 'groups' : 'all',
      group_ids: assign.allocated_groups?.map(g => g.id) || []
    });
    setIsModalOpen(true);
  };

  const handleGroupCheckboxToggle = (groupId) => {
    setFormData(prev => {
      const exists = prev.group_ids.includes(groupId);
      return {
        ...prev,
        group_ids: exists 
          ? prev.group_ids.filter(id => id !== groupId)
          : [...prev.group_ids, groupId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.allocation_type === 'groups' && formData.group_ids.length === 0) {
      toast.error('Please select at least one group for group-specific allocation.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAssignment) {
        // Edit existing
        const res = await api.put(`/assignments/${editingAssignment.id}`, formData);
        if (res.data.success) {
          toast.success('Assignment updated successfully!');
          setIsModalOpen(false);
          await fetchData();
        }
      } else {
        // Create new
        const res = await api.post('/assignments', formData);
        if (res.data.success) {
          toast.success('Assignment created successfully!');
          setIsModalOpen(false);
          await fetchData();
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save assignment';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? All submissions associated with it will also be deleted.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await api.delete(`/assignments/${id}`);
      if (res.data.success) {
        toast.success(`Deleted assignment "${title}".`);
        await fetchData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete assignment';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = assignments.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manage Assignments
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Create coursework, configure group allocations, and manage OneDrive submission endpoints.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Assignment</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assignments by title or keyword..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Assignments Found</h3>
            <p className="text-sm text-slate-500 mt-1">
              Click the "Create Assignment" button above to publish your first assignment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Assignment</th>
                  <th className="px-6 py-3.5">Due Date</th>
                  <th className="px-6 py-3.5">Allocation</th>
                  <th className="px-6 py-3.5">Submissions</th>
                  <th className="px-6 py-3.5">OneDrive</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const dueDate = new Date(item.due_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-500 line-clamp-1 max-w-md mt-0.5">
                          {item.description}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">
                        {dueDate}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.allocation_type === 'all' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                            All Students
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                            <Users className="w-3 h-3 text-indigo-600" />
                            <span>{item.allocated_groups?.length || 0} Groups</span>
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {item.submissions_count || 0}
                      </td>

                      <td className="px-6 py-4">
                        <a
                          href={item.onedrive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          <span>Open Link</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Assignment"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.title)}
                            disabled={deletingId === item.id}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Assignment"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full my-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Assignment Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Milestone 2: Backend Architecture"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe assignment objectives and submission deliverables..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    OneDrive Submission URL
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.onedrive_link}
                    onChange={(e) => setFormData({ ...formData, onedrive_link: e.target.value })}
                    placeholder="https://1drv.ms/u/s!..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Allocation Option */}
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Assignment Allocation
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <label className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-sm font-medium ${
                    formData.allocation_type === 'all'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="allocation_type"
                      checked={formData.allocation_type === 'all'}
                      onChange={() => setFormData({ ...formData, allocation_type: 'all' })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>All Enrolled Students</span>
                  </label>

                  <label className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-sm font-medium ${
                    formData.allocation_type === 'groups'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="allocation_type"
                      checked={formData.allocation_type === 'groups'}
                      onChange={() => setFormData({ ...formData, allocation_type: 'groups' })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Specific Groups</span>
                  </label>
                </div>

                {formData.allocation_type === 'groups' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 max-h-44 overflow-y-auto">
                    <p className="text-xs font-semibold text-slate-600 mb-1">Select Groups:</p>
                    {groups.length === 0 ? (
                      <p className="text-xs text-slate-500">No groups available.</p>
                    ) : (
                      groups.map((g) => (
                        <label key={g.id} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.group_ids.includes(g.id)}
                            onChange={() => handleGroupCheckboxToggle(g.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-medium text-slate-900">{g.name}</span>
                          <span className="font-mono text-slate-500">({g.group_code})</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingAssignment ? 'Save Changes' : 'Create Assignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}