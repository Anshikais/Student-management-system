import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import SubmissionModal from '../../components/SubmissionModal';
import { 
  BookOpen, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  Calendar, 
  Filter,
  Loader2 
} from 'lucide-react';

export default function StudentAssignments() {
  const { user } = useAuth();
  const toast = useToast();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | pending | completed | overdue
  const [group, setGroup] = useState(null);

  // Modal State
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const [assignRes, groupRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/groups')
      ]);

      if (assignRes.data.success) {
        setAssignments(assignRes.data.data.assignments || []);
      }
      if (groupRes.data.success) {
        setGroup(groupRes.data.data.group);
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
      toast.error('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleConfirmSubmission = async () => {
    if (!selectedAssignment) return;
    setIsSubmitting(true);
    try {
      const res = await api.post('/submissions/confirm', {
        assignment_id: selectedAssignment.id,
        group_id: group?.id
      });
      if (res.data.success) {
        toast.success('Assignment submission recorded successfully!');
        setSelectedAssignment(null);
        await fetchAssignments();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Submission confirmation failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLeader = group?.is_leader || group?.leader_id === user?.id;

  // Filtered assignments
  const filtered = assignments.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'completed') return a.is_submitted;
    if (filter === 'pending') return !a.is_submitted && !a.is_overdue;
    if (filter === 'overdue') return a.is_overdue;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Assignments
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            View course assignments, access OneDrive folders, and record group submissions.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assignments by title or description..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'completed', label: 'Completed' },
            { id: 'overdue', label: 'Overdue' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No Assignments Match Your Criteria</h3>
          <p className="text-sm text-slate-500 mt-1">
            Try adjusting your search query or filter selection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((item) => {
            const dueDate = new Date(item.due_date);
            const formattedDate = dueDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={item.id}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900">
                      {item.title}
                    </h3>

                    {/* Status Pill */}
                    {item.is_submitted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Submitted</span>
                      </span>
                    ) : item.is_overdue ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Overdue</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending</span>
                      </span>
                    )}

                    {item.allocation_type === 'all' ? (
                      <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        All Students
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Group Exclusive
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Due: {formattedDate}</span>
                    </span>

                    {item.is_submitted && item.confirmed_by_name && (
                      <span className="text-emerald-700 font-medium">
                        ✓ Confirmed by {item.confirmed_by_name} ({new Date(item.submitted_at).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href={item.onedrive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <span>Open OneDrive</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>

                  {!item.is_submitted && (
                    <button
                      onClick={() => setSelectedAssignment(item)}
                      disabled={!isLeader}
                      title={!isLeader ? 'Only the group leader can confirm submission' : ''}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Yes, I have submitted</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Two-Step Confirmation Modal */}
      <SubmissionModal
        isOpen={!!selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
        onConfirm={handleConfirmSubmission}
        assignmentTitle={selectedAssignment?.title}
        onedriveLink={selectedAssignment?.onedrive_link}
        isLeader={isLeader}
        isLoading={isSubmitting}
      />
    </div>
  );
}