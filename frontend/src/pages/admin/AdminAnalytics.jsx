import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Loader2,
  Award
} from 'lucide-react';

export default function AdminAnalytics() {
  const toast = useToast();

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.get('/submissions/progress');
        if (res.data.success) {
          setMetrics(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
        toast.error('Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading course analytics...</p>
        </div>
      </div>
    );
  }

  const {
    total_assignments = 0,
    total_groups = 0,
    total_students = 0,
    completed_groups = 0,
    pending_groups = 0,
    overall_progress_percentage = 0,
    groups = []
  } = metrics || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Class Analytics & Performance
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Detailed metrics, submission ratios, and group progress breakdowns.
        </p>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Students</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{total_students}</div>
          <div className="text-xs text-slate-500 mt-0.5">Active enrollment</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Groups</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{total_groups}</div>
          <div className="text-xs text-slate-500 mt-0.5">Registered teams</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assignments</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{total_assignments}</div>
          <div className="text-xs text-slate-500 mt-0.5">Coursework count</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Completed Teams</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{completed_groups}</div>
          <div className="text-xs text-emerald-700 mt-0.5">100% finished</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pending Teams</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{pending_groups}</div>
          <div className="text-xs text-amber-700 mt-0.5">Assignments remaining</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Completion</span>
          <div className="text-2xl font-black text-indigo-600 mt-1">{overall_progress_percentage}%</div>
          <div className="text-xs text-indigo-700 mt-0.5">Class average</div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Overall Completion Dial / Radial Representation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">Overall Submission Rate</h3>
            </div>
            <p className="text-xs text-slate-500">Aggregate completion across all assignment pairs</p>
          </div>

          <div className="my-8 flex flex-col items-center justify-center">
            <div className="relative w-44 h-44 flex items-center justify-center">
              {/* SVG Radial Gauge */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#4f46e5"
                  strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * overall_progress_percentage) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-slate-900">{overall_progress_percentage}%</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-xs">
            <div className="text-center p-2.5 bg-emerald-50 rounded-xl">
              <span className="block font-bold text-emerald-800 text-base">{completed_groups}</span>
              <span className="text-emerald-700">Finished Groups</span>
            </div>
            <div className="text-center p-2.5 bg-amber-50 rounded-xl">
              <span className="block font-bold text-amber-800 text-base">{pending_groups}</span>
              <span className="text-amber-700">Pending Groups</span>
            </div>
          </div>
        </div>

        {/* Right 2 cols: Group Comparison Horizontal Bars */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">Group Completion Benchmark</h3>
            </div>
            <p className="text-xs text-slate-500">Comparative progress of every group</p>
          </div>

          <div className="flex-1 space-y-4 max-h-96 overflow-y-auto pr-1">
            {groups.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No active groups registered yet.
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.id} className="space-y-1.5 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{g.name} <span className="font-mono text-slate-400">({g.group_code})</span></span>
                    <span className="font-bold text-indigo-600">{g.completed} / {g.total_assigned} ({g.progress_percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ${
                        g.progress_percentage === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${g.progress_percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Leader: {g.leader_name}</span>
                    <span>{g.pending} pending</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}