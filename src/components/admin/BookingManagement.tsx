import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, CheckCircle, XCircle, Clock, Filter, ChevronRight, User, GraduationCap, AlertCircle } from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Booking } from '@/src/types';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';

export const BookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('bookingDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleUpdateStatus = async (bookingId: string, newStatus: 'confirmed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { status: newStatus });
      toast.success(`Booking ${newStatus === 'confirmed' ? 'approved' : 'rejected'}`);
    } catch (error) {
      toast.error('Failed to update booking status');
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.trainingSnapshot.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by training title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm outline-none font-bold text-slate-700"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-2xl animate-pulse">
            <AlertCircle size={16} />
            <span className="text-xs font-black uppercase tracking-widest">{pendingCount} Pending Requests</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card-premium !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50">
                <th className="px-8 py-6">Training Session</th>
                <th className="px-6 py-6">Date & Time</th>
                <th className="px-6 py-6">Status</th>
                <th className="px-6 py-6">Attendance</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <AnimatePresence mode="popLayout">
                {filteredBookings.map((booking) => (
                  <motion.tr 
                    key={booking.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 leading-tight mb-1">{booking.trainingSnapshot.title}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">ID: {booking.id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-slate-500 font-medium">
                      <div className="flex flex-col">
                        <span>{booking.trainingSnapshot.date.toDate().toLocaleDateString()}</span>
                        <span className="text-[10px] text-slate-400">{booking.trainingSnapshot.startTime} - {booking.trainingSnapshot.endTime}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        booking.status === 'confirmed' ? "bg-accent/10 text-accent" : 
                        booking.status === 'cancelled' ? "bg-red-50 text-red-500" : "bg-primary/10 text-primary"
                      )}>
                        {booking.status === 'confirmed' ? 'Approved' : booking.status === 'cancelled' ? 'Rejected' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      {booking.attended ? (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 text-accent font-black text-[10px] uppercase tracking-widest">
                            <CheckCircle size={14} />
                            <span>Attended</span>
                          </div>
                          {booking.checkInTime && (
                            <span className="text-[10px] text-slate-400 font-medium mt-1">
                              {booking.checkInTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-300 font-black text-[10px] uppercase tracking-widest">
                          <Clock size={14} />
                          <span>Pending</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      {booking.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                            className="p-2 bg-accent text-white rounded-xl shadow-lg shadow-accent/20 hover:scale-110 active:scale-95 transition-all"
                            title="Approve"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                            className="p-2 bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20 hover:scale-110 active:scale-95 transition-all"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                      {booking.status !== 'pending' && (
                        <span className="text-[10px] text-slate-300 font-black uppercase italic">Processed</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredBookings.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-300 italic font-medium">
                    No matching bookings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
