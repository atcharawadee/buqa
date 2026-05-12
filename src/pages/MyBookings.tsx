import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bookmark, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Calendar, 
  MapPin, 
  Loader2, 
  Inbox,
  AlertCircle 
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  runTransaction 
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/lib/AuthContext';
import { Booking, Training } from '@/src/types';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';

export const MyBookings: React.FC = () => {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', currentUser.uid),
      orderBy('bookingDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(docs);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  const handleCancel = async (booking: Booking) => {
    if (!currentUser) return;
    
    // Check if training already started
    const trainingDate = booking.trainingSnapshot.date.toDate();
    const now = new Date();
    if (trainingDate < now) {
      toast.error('Cannot cancel a session that has already started or passed');
      return;
    }

    if (!confirm('Are you sure you want to cancel this reservation? This action will free up your seat for others.')) {
      return;
    }

    setCancellingId(booking.id);
    try {
      await runTransaction(db, async (transaction) => {
        const bookingRef = doc(db, 'bookings', booking.id);
        const trainingRef = doc(db, 'trainings', booking.trainingId);
        
        const trainingDoc = await transaction.get(trainingRef);
        if (!trainingDoc.exists()) {
          throw new Error('Training session no longer exists');
        }

        const trainingData = trainingDoc.data() as Training;
        
        transaction.update(bookingRef, { status: 'cancelled' });
        transaction.update(trainingRef, { 
          currentBookings: Math.max(0, trainingData.currentBookings - 1),
          status: 'open' // When a seat is freed, it's definitely open if it was full
        });
      });
      toast.success('Reservation cancelled successfully');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to cancel reservation');
    } finally {
      setCancellingId(null);
    }
  };

  const activeBookings = bookings.filter(b => b.status !== 'cancelled');
  const pastBookings = bookings.filter(b => {
    const isPast = b.trainingSnapshot.date.toDate() < new Date();
    return isPast && b.status === 'confirmed';
  });
  const upcomingBookings = activeBookings.filter(b => b.trainingSnapshot.date.toDate() >= new Date());

  const stats = {
    total: activeBookings.length,
    pending: activeBookings.filter(b => b.status === 'pending').length,
    hours: pastBookings.length * 3 // Mock hours (3 per session)
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={40} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">My Journey</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage your professional development track at BU</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase">Total Hours</p>
              <p className="text-lg font-black text-slate-900">{stats.hours.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Active / Upcoming Bookings */}
          <section>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
              <span>Upcoming Sessions</span>
              <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded-lg text-xs">{upcomingBookings.length}</span>
            </h2>
            
            {upcomingBookings.length > 0 ? (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {upcomingBookings.map((booking) => (
                    <motion.div 
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="card-premium group hover:border-primary/20"
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="w-full md:w-24 h-24 bg-slate-900 rounded-[1.5rem] flex-shrink-0 flex items-center justify-center text-white/20 relative overflow-hidden">
                          <Calendar size={40} />
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                        </div>
                        
                        <div className="flex-grow">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest",
                              booking.status === 'confirmed' ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                            )}>
                              {booking.status === 'confirmed' ? 'อนุมัติแล้ว' : 'รอการอนุมัติ'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              ID: {booking.id.slice(0, 8)}
                            </span>
                          </div>
                          <h3 className="text-lg font-black text-slate-900 leading-tight mb-2 group-hover:text-primary transition-colors">
                            {booking.trainingSnapshot.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={14} className="text-primary/40" />
                              <span className="text-xs font-bold">
                                {booking.trainingSnapshot.date.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock size={14} className="text-primary/40" />
                              <span className="text-xs font-bold">{booking.trainingSnapshot.startTime} - {booking.trainingSnapshot.endTime}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin size={14} className="text-primary/40" />
                              <span className="text-xs font-bold truncate max-w-[200px]">{booking.trainingSnapshot.location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center md:flex-col md:justify-center gap-2">
                          <button 
                            disabled={cancellingId === booking.id}
                            onClick={() => handleCancel(booking)}
                            className="p-4 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"
                            title="Cancel Reservation"
                          >
                            {cancellingId === booking.id ? (
                              <Loader2 size={20} className="animate-spin" />
                            ) : (
                              <Trash2 size={20} />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4">
                  <Inbox size={32} />
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No upcoming trainings scheduled</p>
                <p className="text-slate-300 text-[10px] mt-1 font-medium">Browse our catalog to find your next professional leap</p>
              </div>
            )}
          </section>

          {/* Past Bookings / Cancellation History */}
          <section>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
              <span>Completed & Others</span>
            </h2>
            <div className="space-y-3 opacity-60">
              {bookings.filter(b => b.status === 'cancelled' || b.trainingSnapshot.date.toDate() < new Date()).slice(0, 5).map(b => (
                <div key={b.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      b.status === 'cancelled' ? "bg-red-50 text-red-400" : "bg-slate-50 text-slate-400"
                    )}>
                      {b.status === 'cancelled' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 truncate max-w-md">{b.trainingSnapshot.title}</h4>
                      <p className="text-[10px] font-bold text-slate-400">
                        {b.trainingSnapshot.date.toDate().toLocaleDateString()} • 
                        {b.status === 'cancelled' ? ' ยกเลิกแล้ว (Cancelled)' : ' สำเร็จแล้ว (Completed)'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {bookings.length === 0 && !loading && (
                <p className="text-slate-300 text-center py-4 italic text-sm">No historical records found</p>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 -mr-16 -mt-16 blur-2xl rounded-full" />
            <h3 className="text-xl font-black mb-8 flex items-center gap-3">
              <Bookmark size={24} className="text-primary" />
              <span className="uppercase tracking-widest text-sm">Development Stats</span>
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Enrolled Sessions</span>
                <span className="text-2xl font-black">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Knowledge Hours</span>
                <span className="text-2xl font-black text-primary">{stats.hours.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Pending Waitlist</span>
                <span className="text-2xl font-black text-accent">{stats.pending}</span>
              </div>
            </div>

            <button className="w-full mt-10 bg-white text-slate-900 py-4 rounded-[1.5rem] font-black uppercase text-xs hover:bg-primary hover:text-white transition-all">
              Request Certificate Log
            </button>
          </motion.div>

          <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Professional Tips</h4>
            <ul className="space-y-4">
              <li className="flex gap-3 text-xs font-medium text-slate-500">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                <span>Attendance is tracked via QR Check-in during the session.</span>
              </li>
              <li className="flex gap-3 text-xs font-medium text-slate-500">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                <span>Please cancel at least 24 hours in advance if you cannot attend.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
