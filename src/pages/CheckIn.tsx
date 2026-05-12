import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  BookOpen, 
  Calendar, 
  MapPin, 
  User, 
  Loader2,
  ArrowRight,
  Activity
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  getDoc,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/lib/AuthContext';
import { Training, Booking } from '@/src/types';
import toast from 'react-hot-toast';

export const CheckIn: React.FC = () => {
  const { trainingId } = useParams<{ trainingId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [training, setTraining] = useState<Training | null>(null);

  const [attendees, setAttendees] = useState<any[]>([]);
  const [allConfirmedBookings, setAllConfirmedBookings] = useState<Booking[]>([]);
  const [timeoutTriggered, setTimeoutTriggered] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const performCheckIn = async () => {
      if (!user || !trainingId) return;

      console.log(`Starting check-in for user ${user.uid} and training ${trainingId}`);

      // Set a safety timeout
      timeoutId = setTimeout(() => {
        if (loading) {
          console.warn('Check-in timed out');
          setTimeoutTriggered(true);
        }
      }, 5000);

      try {
        // 1. Fetch training details
        const trainingRef = doc(db, 'trainings', trainingId);
        const trainingSnap = await getDoc(trainingRef);
        
        if (!trainingSnap.exists()) {
          setError('ไม่พบข้อมูลโครงการฝึกอบรมนี้');
          setLoading(false);
          return;
        }
        setTraining({ id: trainingSnap.id, ...trainingSnap.data() } as Training);

        // 2. Search for booking
        const q = query(
          collection(db, 'bookings'),
          where('userId', '==', user.uid),
          where('trainingId', '==', trainingId)
        );
        
        const bookingSnap = await getDocs(q);
        
        if (bookingSnap.empty) {
          console.log('No booking found');
          setError('ไม่พบข้อมูลการจองสำหรับโครงการนี้');
          setLoading(false);
          return;
        }

        const bookingDoc = bookingSnap.docs[0];
        const bookingData = bookingDoc.data() as Booking;

        console.log('Booking found:', bookingData);

        if (bookingData.status !== 'confirmed') {
          setError('การจองของคุณยังไม่ได้รับการอนุมัติ');
          setLoading(false);
          return;
        }

        if (bookingData.attended) {
          console.log('User already attended');
          setSuccess(true);
          setLoading(false);
          return;
        }

        // 3. Update attendance
        await updateDoc(doc(db, 'bookings', bookingDoc.id), {
          attended: true,
          checkInTime: serverTimestamp()
        });

        console.log('Check-in update successful');
        setSuccess(true);
        setLoading(false);
        toast.success('เช็คอินสำเร็จ!');
      } catch (err: any) {
        console.error('Check-in error:', err);
        setError(`การเช็คอินล้มเหลว: ${err.message || 'Error'}`);
        setLoading(false);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    if (!success) {
      performCheckIn();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, trainingId, success]);

  useEffect(() => {
    if (!success || !trainingId) return;

    // Listen to all confirmed bookings to calculate registration order
    const qAll = query(
      collection(db, 'bookings'),
      where('trainingId', '==', trainingId),
      where('status', '==', 'confirmed'),
      orderBy('bookingDate', 'asc')
    );

    const unsubAll = onSnapshot(qAll, (snapshot) => {
      setAllConfirmedBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[]);
    });

    // Listen to attendees in real-time
    const qAttended = query(
      collection(db, 'bookings'),
      where('trainingId', '==', trainingId),
      where('attended', '==', true),
      orderBy('checkInTime', 'desc')
    );

    const unsubAttended = onSnapshot(qAttended, async (snapshot) => {
      const attendeesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
      
      // Fetch user details for each attendee
      const enrichedAttendees = await Promise.all(attendeesList.map(async (bk) => {
        const userRef = doc(db, 'users', bk.userId);
        const userSnap = await getDoc(userRef);
        return {
          ...bk,
          userProfile: userSnap.exists() ? userSnap.data() : null
        };
      }));

      setAttendees(enrichedAttendees);
    });

    return () => {
      unsubAll();
      unsubAttended();
    };
  }, [success, trainingId]);

  const getRegistrationRank = (bookingId: string) => {
    const sorted = [...allConfirmedBookings].sort((a, b) => a.bookingDate.toMillis() - b.bookingDate.toMillis());
    return sorted.findIndex(b => b.id === bookingId) + 1;
  };

  const getCheckInRank = (bookingId: string) => {
    // Attendees are already sorted by checkInTime desc in the onSnapshot, 
    // but for rank we need them sorted asc.
    const sorted = [...attendees].sort((a, b) => (a.checkInTime?.toMillis() || 0) - (b.checkInTime?.toMillis() || 0));
    return sorted.findIndex(b => b.id === bookingId) + 1;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-[3rem] shadow-xl border border-slate-100 max-w-xs w-full">
          {timeoutTriggered ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6"
            >
              <XCircle className="w-16 h-16 text-red-400 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">การเชื่อมต่อล่าช้า</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  การตรวจสอบใช้เวลานานเกินไป <br />กรุณาลองใหม่อีกครั้ง
                </p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
              >
                Retry Check-in
              </button>
            </motion.div>
          ) : (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Verifying Presence...</p>
              <p className="text-slate-300 font-bold uppercase tracking-widest text-[8px] mt-2">Please stay on this page</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl shadow-slate-200 overflow-hidden border border-slate-100"
      >
        {success ? (
          <div className="p-10 text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="w-24 h-24 bg-accent text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-accent/20"
            >
              <CheckCircle size={48} />
            </motion.div>
            
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Check-in Complete!</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">Attendance recorded successfully</p>
            
            {training && (
              <div className="bg-slate-50 rounded-3xl p-6 text-left mb-8 space-y-4">
                <div className="flex items-center gap-3">
                  <BookOpen size={18} className="text-primary" />
                  <span className="font-black text-slate-900 text-sm">{training.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-slate-400" />
                  <span className="text-slate-500 text-xs font-bold uppercase">{training.date.toDate().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-slate-400" />
                  <span className="text-slate-500 text-xs font-bold uppercase">{training.startTime} - {training.endTime}</span>
                </div>
              </div>
            )}

            <button 
              onClick={() => navigate('/bookings')}
              className="w-full btn-primary flex items-center justify-center gap-2 mb-12"
            >
              <span>Back to My Bookings</span>
              <ArrowRight size={18} />
            </button>

            {/* Live Attendance Table */}
            <div className="text-left">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  <span>Recent Attendees</span>
                </h2>
                <div className="flex items-center gap-1.5 bg-accent/10 px-2 py-1 rounded-lg">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-accent uppercase">{attendees.length} Verified</span>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                        <th className="px-6 py-4">No. Signup / Check-in</th>
                        <th className="px-4 py-4">Participant</th>
                        <th className="px-4 py-4">Position / Dept</th>
                        <th className="px-6 py-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {attendees.map((att) => (
                        <motion.tr 
                          key={att.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-900">#{getRegistrationRank(att.id)}</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Reg Order</span>
                              </div>
                              <div className="w-px h-4 bg-slate-200" />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-primary">#{getCheckInRank(att.id)}</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Entry</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                <User size={14} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900 truncate max-w-[120px]">
                                  {att.userProfile?.displayName || 'Unknown'}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium">{att.userProfile?.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-600 uppercase">
                                {att.userProfile?.position || 'Staff'}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase">
                                {att.userProfile?.department || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="px-2 py-0.5 bg-accent/10 text-accent rounded text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                              เช็คอินแล้ว
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                      {attendees.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-300 italic text-xs">
                            Waiting for participants...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-10 text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8"
            >
              <XCircle size={48} />
            </motion.div>
            
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Error Occurred</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">Check-in could not be completed</p>
            
            <div className="bg-red-50 text-red-600 rounded-2xl p-4 text-xs font-black uppercase tracking-widest mb-8">
              {error}
            </div>

            <button 
              onClick={() => navigate('/')}
              className="w-full py-4 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20"
            >
              Return Home
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
