import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { 
  Users, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  Plus, 
  ExternalLink, 
  ChevronRight,
  Loader2,
  Calendar
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total_assignments: 0,
    total_groups: 0,
    total_students: 0,
    completed_groups: 0,
    pending_groups: 0,
    overall_progress_percentage: 0,
    groups: []
  });
  const [recentSubmissions, setRecentSubmissions] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [progressRes, subsRes] = await Promise.all([
        api.get('/submissions/progress'),
        api.get('/submissions')
      ]);

      if (progressRes.data.success) {
        setMetrics(progressRes.data.data);
      }
      if (subsRes.data.success) {
        setRecentSubmissions(subsRes.data.data.submissions?.slice(0, 5) || []);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      toast.error('Failed to load system analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading professor analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Administrator Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome, Professor {user?.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor real-time student group engagement, assignment allocations, and submission analytics.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/admin/assignments"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Assignment</span>
          </Link>
          <Link
            to="/admin/submissions"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/70 text-slate-800 rounded-xl text-sm font-semibold transition-all"
          >
            <span>Tracking Grid</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Students</div>
          <div className="text-2xl font-black text-slate-900">{metrics.total_students}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Enrolled</div>
        </div>

        {/* Total Groups */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Groups</div>
          <div className="text-2xl font-black text-slate-900">{metrics.total_groups}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active teams</div>
        </div>

        {/* Total Assignments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Assignments</div>
          <div className="text-2xl font-black text-slate-900">{metrics.total_assignments}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Course total</div>
        </div>

        {/* Completed Groups */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">Completed</div>
          <div className="text-2xl font-black text-emerald-600">{metrics.completed_groups}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">100% finished</div>
        </div>

        {/* Pending Groups */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">Pending</div>
          <div className="text-2xl font-black text-amber-600">{metrics.pending_groups}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">In progress</div>
        </div>

        {/* Completion % */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">Overall Rate</div>
          <div className="text-2xl font-black text-indigo-600">{metrics.overall_progress_percentage}%</div>
          <div className="text-[11px] text-indigo-700 mt-0.5">Completion rate</div>
        </div>
      </div>

      {/* Visual System Progress Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800">Class-wide Submission Rate</h3>
          </div>
          <span className="text-base font-bold text-indigo-600">{metrics.overall_progress_percentage}% Completed</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, metrics.overall_progress_percentage))}%` }}
          />
        </div>
      </div>

      {/* Group Progress Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Group Progress Overview</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time status of each active team</p>
          </div>
          <Link
            to="/admin/groups"
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <span>Manage Groups</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Group</th>
                <th className="px-6 py-3.5">Group Code</th>
                <th className="px-6 py-3.5">Leader</th>
                <th className="px-6 py-3.5">Assigned</th>
                <th className="px-6 py-3.5">Submitted</th>
                <th className="px-6 py-3.5">Progress</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.groups?.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">{g.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">{g.group_code}</td>
                  <td className="px-6 py-4 text-slate-700">{g.leader_name}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{g.total_assigned}</td>
                  <td className="px-6 py-4 font-semibold text-indigo-600">{g.completed}</td>
                  <td className="px-6 py-4 w-44">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${g.progress_percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{g.progress_percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {g.is_completed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Finished</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>In Progress</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Submissions Feed */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Group Confirmations</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest submissions confirmed by student leaders</p>
          </div>
          <Link
            to="/admin/submissions"
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {recentSubmissions.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No submissions recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentSubmissions.map((sub) => {
              const confirmDate = new Date(sub.confirmed_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={sub.id} className="p-5 hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{sub.assignment_title}</span>
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {sub.group_name}
                      </span>
                      {sub.is_late && (
                        <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Late
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      Confirmed by <span className="font-medium text-slate-800">{sub.confirmed_by_name}</span> ({sub.confirmed_by_email})
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-400 shrink-0">
                    {confirmDate}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}