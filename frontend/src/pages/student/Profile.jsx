import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, IdCard, Users, Shield, LogOut, Calendar } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Student Profile
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Your personal academic credentials and group enrollment status.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            {user?.name?.charAt(0) || 'S'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {user?.role}
              </span>
              {user?.group?.is_leader && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Group Leader
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              <IdCard className="w-4 h-4 text-slate-400" />
              <span>Student ID</span>
            </div>
            <div className="text-base font-mono font-bold text-slate-900">
              {user?.student_id || 'Not Assigned'}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>Email Address</span>
            </div>
            <div className="text-base font-medium text-slate-900 truncate">
              {user?.email}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              <Users className="w-4 h-4 text-slate-400" />
              <span>Enrolled Group</span>
            </div>
            <div className="text-base font-bold text-slate-900">
              {user?.group?.name || 'Unassigned'}
            </div>
            {user?.group && (
              <div className="text-xs text-blue-600 font-mono mt-0.5">
                Code: {user.group.group_code}
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              <Shield className="w-4 h-4 text-slate-400" />
              <span>Authentication</span>
            </div>
            <div className="text-base font-medium text-slate-900">
              JWT Bearer Session
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-sm rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}