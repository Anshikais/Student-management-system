import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  CheckSquare, 
  CheckCircle2, 
  Clock, 
  Users, 
  BookOpen, 
  Loader2, 
  ExternalLink,
  Calendar
} from 'lucide-react';

export default function SubmissionTracking() {
  const toast = useToast();

  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Load assignments for dropdown
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const res = await api.get('/assignments');
        if (res.data.success) {
          const list = res.data.data.assignments || [];
          setAssignments(list);
          if (list.length > 0) {
            setSelectedAssignmentId(list[0].id.toString());
          }
        }
      } catch (err) {
        console.error('Failed to load assignments:', err);
        toast.error('Failed to load assignments.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // When selected assignment changes, fetch tracking details
  useEffect(() => {
    if (!selectedAssignmentId) return;

    const fetchTracking = async () => {
      setLoadingTracking(true);
      try {
        const res = await api.get(`/submissions/assignment/${selectedAssignmentId}`);
        if (res.data.success) {
          setTrackingData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load tracking data:', err);
        toast.error('Failed to load submission tracking.');
      } finally {
        setLoadingTracking(false);
      }
    };

    fetchTracking();
  }, [selectedAssignmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading submission tracking...</p>
        </div>
      </div>
    );
  }

  const selectedAssignment = assignments.find(a => a.id.toString() === selectedAssignmentId);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Submission Tracking
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Monitor assignment-wise group completions, leader confirmations, and pending teams.
          </p>
        </div>

        {/* Assignment Select Dropdown */}
        <div className="w-full sm:w-80">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Select Assignment to Monitor
          </label>
          <select
            value={selectedAssignmentId}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingTracking ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      ) : trackingData ? (
        <div className="space-y-6">
          {/* Summary KPIs for this assignment */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Eligible Groups</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{trackingData.total_eligible_groups}</div>
              <div className="text-xs text-slate-500 mt-0.5">Assigned teams</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Submitted</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{trackingData.submitted_groups}</div>
              <div className="text-xs text-emerald-700 mt-0.5">Confirmed uploads</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pending</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{trackingData.pending_groups}</div>
              <div className="text-xs text-amber-700 mt-0.5">Awaiting submission</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Completion</span>
              <div className="text-2xl font-black text-indigo-600 mt-1">{trackingData.completion_percentage}%</div>
              <div className="text-xs text-indigo-700 mt-0.5">Turnout rate</div>
            </div>
          </div>

          {/* Group Tracking Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{trackingData.assignment_title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Roster of all groups expected to submit this assignment</p>
              </div>
              {selectedAssignment?.onedrive_link && (
                <a
                  href={selectedAssignment.onedrive_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <span>Open Target OneDrive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Group</th>
                    <th className="px-6 py-3.5">Group Code</th>
                    <th className="px-6 py-3.5">Group Leader</th>
                    <th className="px-6 py-3.5">Submission Status</th>
                    <th className="px-6 py-3.5">Confirmed By</th>
                    <th className="px-6 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trackingData.groups?.map((g) => {
                    const confirmDate = g.confirmed_at 
                      ? new Date(g.confirmed_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '—';

                    return (
                      <tr key={g.group_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {g.group_name}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-indigo-600 font-semibold">
                          {g.group_code}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {g.leader_name}
                        </td>
                        <td className="px-6 py-4">
                          {g.is_submitted ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Submitted</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Pending</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-800">
                          {g.confirmed_by_name || '—'}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">
                          {confirmDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}