import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  UserCheck, 
  Clock, 
  Activity, 
  ChevronDown, 
  User, 
  Building,
  Hash,
  Filter
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { Booking, Training } from '@/src/types';
import { cn } from '@/src/lib/utils';

interface EnrichedAttendee extends Booking {
  staffDetails?: any;
}

interface AttendanceTrackingProps {
  trainingId: string;
  trainingTitle: string;
}

export const AttendanceTracking: React.FC<AttendanceTrackingProps> = ({ trainingId, trainingTitle }) => {
  const [attendees, setAttendees] = useState<EnrichedAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'reg' | 'checkin'>('checkin');

  useEffect(() => {
    // 1. Listen for all confirmed bookings for this training
    const q = query(
      collection(db, 'bookings'),
      where('trainingId', '==', trainingId),
      where('status', '==', 'confirmed')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const bookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Booking[];
      
      // 2. Fetch staff/user details for each booking
      const enriched = await Promise.all(bookings.map(async (bk) => {
        // Try user profile first
        const userRef = doc(db, 'users', bk.userId);
        const userSnap = await getDoc(userRef);
        const userProfile = userSnap.exists() ? userSnap.data() : null;

        // Try staff master if needed
        let staffMaster = null;
        if (userProfile?.email) {
          const staffQ = query(collection(db, 'staff_master'), where('email', '==', userProfile.email));
          const staffSnap = await getDocs(staffQ);
          if (!staffSnap.empty) staffMaster = staffSnap.docs[0].data();
        }

        return {
          ...bk,
          staffDetails: {
            displayName: userProfile?.displayName || staffMaster?.displayName || 'Unknown',
            staffId: userProfile?.staffId || staffMaster?.staffId || 'N/A',
            department: userProfile?.department || staffMaster?.department || 'N/A',
            email: userProfile?.email || staffMaster?.email || bk.userId
          }
        };
      }));

      setAttendees(enriched);
      setLoading(false);
    });

    return unsubscribe;
  }, [trainingId]);

  // Calculations
  const processedAttendees = useMemo(() => {
    // Calculate Reg Order (based on bookingDate asc)
    const sortedByReg = [...attendees].sort((a, b) => a.bookingDate.toMillis() - b.bookingDate.toMillis());
    const attendeesWithRegOrder = attendees.map(a => ({
      ...a,
      regOrder: sortedByReg.findIndex(b => b.id === a.id) + 1
    }));

    // Calculate Check-in Order (based on checkInTime asc)
    const withCheckInOrder = attendeesWithRegOrder.map(a => {
      if (!a.attended) return { ...a, checkInOrder: null };
      const attendedOnes = attendeesWithRegOrder
        .filter(x => x.attended)
        .sort((a, b) => (a.checkInTime?.toMillis() || 0) - (b.checkInTime?.toMillis() || 0));
      return {
        ...a,
        checkInOrder: attendedOnes.findIndex(b => b.id === a.id) + 1
      };
    });

    // Filtering
    let filtered = withCheckInOrder.filter(a => 
      a.staffDetails.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.staffDetails.staffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.staffDetails.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sorting
    if (sortOrder === 'checkin') {
      filtered.sort((a, b) => {
        if (a.attended && b.attended) return (b.checkInTime?.toMillis() || 0) - (a.checkInTime?.toMillis() || 0);
        if (a.attended) return -1;
        if (b.attended) return 1;
        return 0;
      });
    } else {
      filtered.sort((a, b) => a.regOrder - b.regOrder);
    }

    return filtered;
  }, [attendees, searchTerm, sortOrder]);

  const stats = {
    total: attendees.length,
    attended: attendees.filter(a => a.attended).length
  };

  return (
    <div className="space-y-6">
      {/* Header & Local Stats */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Activity className="text-accent" size={24} />
            <span>{trainingTitle}</span>
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Live Attendance Tracking</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-slate-900 leading-none">{stats.attended}</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Attended</span>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black text-slate-400 leading-none">{stats.total}</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Registered</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by Name, Email or Staff ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort By:</span>
          <div className="flex bg-white rounded-xl p-1 border border-slate-100 shadow-sm">
            <button 
              onClick={() => setSortOrder('checkin')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                sortOrder === 'checkin' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Check-in Order
            </button>
            <button 
              onClick={() => setSortOrder('reg')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                sortOrder === 'reg' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Reg Order
            </button>
          </div>
        </div>
      </div>

      {/* Persistence Table */}
      <div className="card-premium !p-0 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                <th className="px-8 py-6">ลำดับ (Signup/Entry)</th>
                <th className="px-6 py-6">ผู้เข้าร่วม (Participant)</th>
                <th className="px-6 py-6">หน่วยงาน (Dept)</th>
                <th className="px-8 py-6 text-right">สถานะ (Status)</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <AnimatePresence mode="popLayout">
                {processedAttendees.map((att) => (
                  <motion.tr 
                    key={att.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900">#{att.regOrder}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Signup</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200" />
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-xs font-black",
                            att.attended ? "text-accent" : "text-slate-300"
                          )}>
                            {att.checkInOrder ? `#${att.checkInOrder}` : '--'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Entry</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                          <User size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-black text-slate-900 leading-tight uppercase truncate">{att.staffDetails.displayName}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{att.staffDetails.staffId}</span>
                            <span className="text-[10px] text-slate-400 font-medium truncate">{att.staffDetails.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700 uppercase">{att.staffDetails.position}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{att.staffDetails.department}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {att.attended ? (
                        <div className="flex flex-col items-end">
                          <span className="px-2.5 py-1 bg-accent/10 text-accent rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <UserCheck size={12} />
                            เช็คอินแล้ว
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                            {att.checkInTime?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 justify-end">
                          <Clock size={12} />
                          ยังไม่ได้เช็คอิน
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {!loading && processedAttendees.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-300 italic font-medium">
                    {searchTerm ? 'No matching attendees found' : 'No confirmed participants for this session yet.'}
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
