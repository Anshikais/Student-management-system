import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import SubmissionModal from '../../components/SubmissionModal';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  ExternalLink, 
  ChevronRight,
  Loader2,
  Calendar
} from 'lucide-react';

export default function StudentDashboard() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total_assignments: 0,
    completed_assignments: 0,
    pending_assignments: 0,
    overdue_assignments: 0,
    progress_percentage: 0
  });
  const [assignments, setAssignments] = useState([]);
  const [group, setGroup] = useState(null);

  // Modal State
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [progressRes, assignRes, groupRes] = await Promise.all([
        api.get('/submissions/progress'),
        api.get('/assignments'),
        api.get('/groups')
      ]);

      if (progressRes.data.success) {
        setMetrics(progressRes.data.data);
      }
      if (assignRes.data.success) {
        setAssignments(assignRes.data.data.assignments || []);
      }
      if (groupRes.data.success) {
        setGroup(groupRes.data.data.group);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      toast.error('Failed to load dashboard metrics. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenSubmission = (assignment) => {
    setSelectedAssignment(assignment);
  };

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
        await fetchData(); // Refresh dashboard metrics immediately
        await refreshUser();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Submission confirmation failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading student dashboard...</p>
        </div>
      </div>
    );
  }

  const isLeader = group?.is_leader || group?.leader_id === user?.id;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <span>Student Portal</span>
            <span>•</span>
            <span>ID: {user?.student_id || 'N/A'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track your group assignments, OneDrive uploads, and submission progress.
          </p>
        </div>

        {/* Group Quick Preview */}
        {group ? (
          <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl shrink-0">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Active Group</div>
              <div className="text-base font-bold text-slate-800">{group.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {group.group_code}
                </span>
                {isLeader && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Leader
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Link
            to="/group"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-500/20 transition-all shrink-0"
          >
            <Users className="w-4 h-4" />
            <span>Join or Create a Group</span>
          </Link>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Assignments */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Assigned</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{metrics.total_assignments}</div>
          <div className="text-xs text-slate-500 mt-1">Assignments allocated</div>
        </div>

        {/* Completed */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completed</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">{metrics.completed_assignments}</div>
          <div className="text-xs text-emerald-700 mt-1">Confirmed submissions</div>
        </div>

        {/* Pending */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600">{metrics.pending_assignments}</div>
          <div className="text-xs text-amber-700 mt-1">Awaiting confirmation</div>
        </div>

        {/* Overdue */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overdue</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-600">{metrics.overdue_assignments}</div>
          <div className="text-xs text-rose-700 mt-1">Past submission deadline</div>
        </div>
      </div>

      {/* Visual Progress Bar Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-base">Group Assignment Completion</h3>
          </div>
          <span className="text-lg font-black text-blue-600">{metrics.progress_percentage}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, metrics.progress_percentage))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
          <span>{metrics.completed_assignments} of {metrics.total_assignments} completed</span>
          <span>{100 - metrics.progress_percentage}% remaining</span>
        </div>
      </div>

      {/* Recent Assignments List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Assignments</h2>
            <p className="text-xs text-slate-500 mt-0.5">Assigned to all students or your specific group</p>
          </div>
          <Link
            to="/assignments"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {assignments.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Assignments Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              There are currently no assignments allocated to your group. Check back soon.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assignments.slice(0, 5).map((item) => {
              const dueDate = new Date(item.due_date);
              const formattedDate = dueDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div
                  key={item.id}
                  className="p-6 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-bold text-slate-900">
                        {item.title}
                      </h4>
                      {/* Status Badges */}
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

                    <p className="text-sm text-slate-600 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Due: {formattedDate}</span>
                      </span>
                      {item.is_submitted && item.confirmed_by_name && (
                        <span>Confirmed by: {item.confirmed_by_name}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={item.onedrive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <span>Open OneDrive</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>

                    {!item.is_submitted && (
                      <button
                        onClick={() => handleOpenSubmission(item)}
                        disabled={!isLeader}
                        title={!isLeader ? 'Only the group leader can confirm submission' : ''}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all"
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
      </div>

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