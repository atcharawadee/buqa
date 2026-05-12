import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, LogIn, GraduationCap, Chrome, LogOut, Shield } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/lib/AuthContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAdmin, login, logout, loading } = useAuth();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'My Bookings', path: '/bookings', protected: true },
    { name: 'Admin Dashboard', path: '/admin', adminOnly: true },
  ];

  const filteredLinks = navLinks.filter(link => {
    if (link.adminOnly && !isAdmin) return false;
    if (link.protected && !currentUser) return false;
    return true;
  });

  useEffect(() => {
    // Nav logic if any
  }, []);

  const handleAdminDashboardClick = (e: React.MouseEvent, path: string) => {
    if (path === '/admin' && !isAdmin) {
      e.preventDefault();
      // Optionally show a toast or alert
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <motion.div 
                whileHover={{ rotate: 10 }}
                className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white"
              >
                <GraduationCap size={24} />
              </motion.div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-primary transition-colors uppercase">
                BU <span className="text-primary">TRAINING</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {filteredLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={(e) => handleAdminDashboardClick(e, link.path)}
                  className={cn(
                    "nav-link",
                    location.pathname === link.path && "nav-link-active"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {link.adminOnly && <Shield size={14} />}
                    {link.name}
                  </span>
                </Link>
              ))}
              
              {!loading && (
                currentUser ? (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                      <img 
                        src={currentUser.photoURL || ''} 
                        alt="Profile" 
                        className="w-7 h-7 rounded-full"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-xs font-bold text-slate-700">{currentUser.displayName?.split(' ')[0]}</span>
                      {isAdmin && <span className="text-[10px] bg-red-100 text-primary px-1.5 rounded font-black">ADMIN</span>}
                    </div>
                    <button 
                      onClick={logout}
                      className="p-2 text-slate-400 hover:text-primary transition-colors"
                      title="Sign Out"
                    >
                      <LogOut size={20} />
                    </button>
                  </div>
                ) : (
                  <Link 
                    to="/login"
                    className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-3xl hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Chrome size={18} className="text-secondary" />
                    <span>Sign In with Google</span>
                  </Link>
                )
              )}
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-2 text-slate-600 hover:text-primary transition-colors"
                id="mobile-menu-button"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-4/5 max-w-sm bg-white z-[70] shadow-2xl p-6 flex flex-col"
            >
              <div className="flex justify-between items-center mb-10">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  BU <span className="text-primary">TRAINING</span>
                </span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-primary transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <nav className="flex flex-col space-y-6">
                {filteredLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "text-lg font-bold transition-colors",
                      location.pathname === link.path ? "text-primary" : "text-slate-600"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      {link.adminOnly && <Shield size={20} />}
                      {link.name}
                    </span>
                  </Link>
                ))}
                
                {!loading && (
                  currentUser ? (
                    <div className="pt-6 border-t border-slate-100 flex flex-col space-y-6">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={currentUser.photoURL || ''} 
                          alt="Profile" 
                          className="w-12 h-12 rounded-full border-2 border-primary/20"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{currentUser.displayName}</span>
                          <span className="text-xs text-slate-500">{currentUser.email}</span>
                          {isAdmin && <span className="text-[10px] font-black text-primary uppercase mt-1">Super Admin</span>}
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center justify-center space-x-2 bg-slate-100 text-slate-600 font-bold py-4 rounded-3xl"
                      >
                        <LogOut size={20} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  ) : (
                    <Link 
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center space-x-2 btn-primary w-full"
                    >
                      <Chrome size={20} />
                      <span>Staff Sign In</span>
                    </Link>
                  )
                )}
              </nav>
              <div className="mt-auto pt-10 border-t border-slate-100 italic text-slate-400 text-sm">
                Empowering Excellence at BU
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                Managed By
              </div>
              <div className="text-slate-700 font-bold text-sm">
                Department of Quality Assurance (BUQA)
              </div>
            </div>
            <div className="flex items-center space-x-6 text-xs text-slate-400 font-medium">
              <a href="#" className="hover:text-primary transition-colors">Internal Directory</a>
              <a href="#" className="hover:text-primary transition-colors">Support Center</a>
              <span className="text-slate-300">|</span>
              <span className="text-slate-900 font-bold">&copy; {new Date().getFullYear()} Bangkok University</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
