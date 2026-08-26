import React from 'react';
import { Shield, Bus, GraduationCap } from 'lucide-react';

export const RoleBadge = ({ role }) => {
  switch (role) {
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
          <Shield className="w-3 h-3 text-purple-600" />
          Transport Admin
        </span>
      );
    case 'driver':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Bus className="w-3 h-3 text-emerald-600" />
          Bus Driver
        </span>
      );
    case 'student':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
          Student
        </span>
      );
  }
};
