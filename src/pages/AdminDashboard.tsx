import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BarChart3, 
  TrendingUp, 
  Settings, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon,
  Search,
  BookOpen,
  UserCheck,
  Activity,
  QrCode,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Training, Booking } from '@/src/types';
import { AddTrainingForm } from '@/src/components/admin/AddTrainingForm';
import { BookingManagement } from '@/src/components/admin/BookingManagement';
import { StaffManagement } from '@/src/components/admin/StaffManagement';
import { QRCodeModal } from '@/src/components/admin/QRCodeModal';
import { AttendanceTracking } from '@/src/components/admin/AttendanceTracking';
import { exportTrainingData } from '@/src/lib/exportUtils';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

type AdminTab = 'sessions' | 'bookings' | 'staff' | 'stats';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('sessions');
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTrainingForQR, setSelectedTrainingForQR] = useState<Training | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedTrainingForAttendance, setSelectedTrainingForAttendance] = useState<Training | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Trainings Watcher
    const qTrainings = query(collection(db, 'trainings'), orderBy('date', 'desc'));
    const unsubTrainings = onSnapshot(qTrainings, (snapshot) => {
      setTrainings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Training[]);
    });

    // Bookings Watcher
    const qBookings = query(collection(db, 'bookings'), orderBy('bookingDate', 'desc'));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[]);
    });

    // Staff Master Count Watcher
    const unsubStaff = onSnapshot(collection(db, 'staff_master'), (snapshot) => {
      setStaffCount(snapshot.size);
    });

    setLoading(false);
    return () => {
      unsubTrainings();
      unsubBookings();
      unsubStaff();
    };
  }, []);

  const stats = useMemo(() => {
    const popular = trainings.length > 0 
      ? [...trainings].sort((a, b) => b.currentBookings - a.currentBookings)[0]?.title 
      : 'N/A';
    
    return {
      totalTrainings: trainings.length,
      activeBookings: bookings.filter(b => b.status === 'confirmed').length,
      popularTraining: popular,
      totalStaff: staffCount
    };
  }, [trainings, bookings, staffCount]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this training?')) {
      try {
        await deleteDoc(doc(db, 'trainings', id));
        toast.success('Training deleted');
      } catch (error) {
        toast.error('Failed to delete');
      }
    }
  };

  const handleExport = async (training: Training) => {
    try {
      setExportingId(training.id);
      await exportTrainingData(training.id, training.title);
      toast.success('Excel export successful');
    } catch (error: any) {
      toast.error(error.message || 'Export failed');
    } finally {
      setExportingId(null);
    }
  };

  const filteredTrainings = trainings.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'sessions', name: 'Manage Sessions', icon: GraduationCap },
    { id: 'bookings', name: 'Approvals', icon: UserCheck, badge: bookings.filter(b => b.status === 'pending').length },
    { id: 'staff', name: 'Staff Database', icon: Users },
    { id: 'stats', name: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 font-sans">
      <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-red-50 text-primary text-[10px] font-black px-2 py-1 rounded uppercase tracking-[0.2em]">Restricted Access</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">BUQA Command</h1>
          <p className="text-slate-500 mt-2 font-medium">Global management for BU training curriculum.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-3xl border border-slate-100 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={cn(
                "relative flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
                activeTab === tab.id 
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.name}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[9px] border-2 border-white">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard icon={<GraduationCap size={24} />} label="Total Trainings" value={stats.totalTrainings} trend="Created sessions" color="bg-indigo-500" />
        <StatCard icon={<UserCheck size={24} />} label="Active Bookings" value={stats.activeBookings} trend="Approved staff" color="bg-accent" />
        <StatCard icon={<Activity size={24} />} label="Popular Training" value={stats.popularTraining} trend="Most interest" color="bg-primary" />
        <StatCard icon={<Users size={24} />} label="Staff Records" value={stats.totalStaff} trend="In master DB" color="bg-slate-900" />
      </div>

      <div className="min-h-[600px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                {selectedTrainingForAttendance ? (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-8"
                  >
                    <button 
                      onClick={() => setSelectedTrainingForAttendance(null)}
                      className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Sessions</span>
                    </button>
                    <AttendanceTracking 
                      trainingId={selectedTrainingForAttendance.id} 
                      trainingTitle={selectedTrainingForAttendance.title} 
                    />
                  </motion.div>
                ) : (
                  <>
                    <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100">
                      <div className="relative w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="Filter sessions..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-sm outline-none"
                        />
                      </div>
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary flex items-center gap-2 ml-4 whitespace-nowrap"
                      >
                        <Plus size={20} />
                        <span>Post Training</span>
                      </button>
                    </div>

                    <div className="card-premium !p-0 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50">
                              <th className="px-8 py-6">Session Title</th>
                              <th className="px-6 py-6">Schedule</th>
                              <th className="px-6 py-6">Utilization</th>
                              <th className="px-8 py-6 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm">
                            {filteredTrainings.map((training) => (
                              <tr key={training.id} className="hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors">
                                <td className="px-8 py-6 font-black text-slate-900">{training.title}</td>
                                <td className="px-6 py-6 font-medium text-slate-500">{training.date.toDate().toLocaleDateString()}</td>
                                <td className="px-6 py-6 font-bold text-slate-900">{training.currentBookings}/{training.capacity}</td>
                                <td className="px-8 py-6 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => setSelectedTrainingForAttendance(training)}
                                      className="p-2 text-slate-400 hover:text-accent transition-colors bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md"
                                      title="Live Attendance"
                                    >
                                      <Activity size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleExport(training)}
                                      disabled={exportingId === training.id}
                                      className="p-2 text-slate-400 hover:text-indigo-500 transition-colors bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md disabled:opacity-50"
                                      title="Export to Excel"
                                    >
                                      {exportingId === training.id ? (
                                        <Loader2 size={16} className="animate-spin" />
                                      ) : (
                                        <FileSpreadsheet size={16} />
                                      )}
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setSelectedTrainingForQR(training);
                                        setIsQRModalOpen(true);
                                      }}
                                      className="p-2 text-slate-400 hover:text-primary transition-colors bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md"
                                      title="Show Check-in QR"
                                    >
                                      <QrCode size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(training.id)}
                                      className="p-2 text-slate-300 hover:text-red-500 transition-colors bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md"
                                      title="Delete Training"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'bookings' && <BookingManagement />}
            {activeTab === 'staff' && <StaffManagement />}
            {activeTab === 'stats' && (
              <div className="card-premium h-[400px] flex items-center justify-center text-slate-400 italic font-medium">
                Comprehensive analytics engine coming soon.
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AddTrainingForm 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => setIsAddModalOpen(false)}
      />

      <QRCodeModal 
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setSelectedTrainingForQR(null);
        }}
        training={selectedTrainingForQR}
      />
    </div>
  );
};

const StatCard = ({ icon, label, value, trend, color }: any) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="card-premium relative overflow-hidden"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-[0.05] -mr-8 -mt-8 rounded-full`} />
    <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-current/20`}>
      {icon}
    </div>
    <div className="text-2xl font-black text-slate-900 mb-1 truncate">{value}</div>
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{label}</div>
    <div className="text-[9px] font-black text-slate-400 bg-slate-50 inline-block px-2.5 py-1.5 rounded-lg border border-slate-100">
      {trend}
    </div>
  </motion.div>
);
