import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Chrome, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/src/lib/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const Login: React.FC = () => {
  const { currentUser, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/";

  useEffect(() => {
    if (currentUser) {
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, from]);

  if (loading) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-premium border border-slate-100 text-center"
      >
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-primary mx-auto mb-8 shadow-inner">
          <GraduationCap size={40} />
        </div>
        
        <h1 className="text-4xl font-black text-slate-900 mb-2">Staff Portal</h1>
        <p className="text-slate-500 font-medium mb-10">
          Bangkok University Training <br /> Management System
        </p>

        <div className="space-y-6">
          <button 
            onClick={login}
            className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-slate-100 py-4 rounded-3xl font-bold text-slate-700 hover:bg-slate-50 hover:border-primary/20 transition-all shadow-sm group"
          >
            <Chrome size={24} className="text-secondary group-hover:scale-110 transition-transform" />
            <span>Sign in with Google Account</span>
          </button>

          <div className="flex items-center gap-2 justify-center text-[10px] uppercase font-bold tracking-widest text-slate-400">
            <ShieldAlert size={14} />
            <span>Access restricted to @bu.ac.th only</span>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-50 italic text-[10px] text-slate-400">
          Managed by BUQA • Department of Quality Assurance
        </div>
      </motion.div>
    </div>
  );
};
