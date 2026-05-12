import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, AlertTriangle, Users, Calendar, MapPin, Clock, ShieldCheck, ChevronRight } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  runTransaction, 
  doc, 
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useAuth } from '@/src/lib/AuthContext';
import { Training, Booking } from '@/src/types';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';

interface BookingModalProps {
  training: Training;
  isOpen: boolean;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ training, isOpen, onClose }) => {
  const { userProfile, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleBooking = async () => {
    if (!currentUser || !userProfile) {
      toast.error('Please sign in to book');
      return;
    }

    setLoading(true);

    try {
      // 1. Past Date Check
      const now = new Date();
      if (training.date.toDate() < now) {
        toast.error('This training has already occurred');
        setLoading(false);
        return;
      }

      // 2. Target Role Check
      if (training.targetRoles.length > 0 && !training.targetRoles.includes(userProfile.position || '')) {
        // Checking position or role. In AuthContext we set position: 'Staff' and role: 'staff'|'admin'
        // If targetRoles includes the specific string
        const matchesRole = training.targetRoles.includes(userProfile.position || '') || 
                           training.targetRoles.includes(userProfile.role === 'admin' ? 'อาจารย์' : 'บุคลากร');
        
        if (!matchesRole) {
          toast.error('Your role does not match the target participants for this session');
          setLoading(false);
          return;
        }
      }

      // 3. Duplicate & Conflict Checks
      const bookingsRef = collection(db, 'bookings');
      
      // Check duplicate
      const duplicateQuery = query(
        bookingsRef, 
        where('userId', '==', currentUser.uid),
        where('trainingId', '==', training.id),
        where('status', '!=', 'cancelled')
      );
      const duplicateSnap = await getDocs(duplicateQuery);
      if (!duplicateSnap.empty) {
        toast.error('You have already booked this session');
        setLoading(false);
        return;
      }

      // Check time conflict on the same date
      // We fetch all active bookings for this user on the same date
      const conflictQuery = query(
        bookingsRef,
        where('userId', '==', currentUser.uid),
        where('status', '!=', 'cancelled')
      );
      const allUserBookings = await getDocs(conflictQuery);
      const conflictingBooking = allUserBookings.docs.find(doc => {
        const b = doc.data() as Booking;
        // Same date
        const isSameDate = b.trainingSnapshot.date.toDate().toDateString() === training.date.toDate().toDateString();
        if (!isSameDate) return false;

        // Overlapping time
        // startA < endB && startB < endA
        const startA = training.startTime;
        const endA = training.endTime;
        const startB = b.trainingSnapshot.startTime;
        const endB = b.trainingSnapshot.endTime;

        return startA < endB && startB < endA;
      });

      if (conflictingBooking) {
        toast.error('Time Conflict: You have another booking overlapping with this session');
        setLoading(false);
        return;
      }

      // 4. Transaction for Seat Availability & Atomic Update
      await runTransaction(db, async (transaction) => {
        const trainingRef = doc(db, 'trainings', training.id);
        const trainingDoc = await transaction.get(trainingRef);

        if (!trainingDoc.exists()) {
          throw new Error('Training session does not exist');
        }

        const data = trainingDoc.data() as Training;
        if (data.currentBookings >= data.capacity) {
          throw new Error('Registration Full: No seats remaining');
        }

        // Create booking
        const newBookingRef = doc(collection(db, 'bookings'));
        const bookingData = {
          trainingId: training.id,
          userId: currentUser.uid,
          status: 'confirmed', // Or pending based on rules
          bookingDate: serverTimestamp(),
          trainingSnapshot: {
            title: training.title,
            date: training.date,
            startTime: training.startTime,
            endTime: training.endTime,
            location: training.location
          }
        };

        transaction.set(newBookingRef, bookingData);
        transaction.update(trainingRef, {
          currentBookings: data.currentBookings + 1,
          status: data.currentBookings + 1 >= data.capacity ? 'full' : 'open'
        });
      });

      toast.success('Professional development secured!');
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-10 border-b border-slate-50 relative">
              <button 
                onClick={onClose}
                className="absolute right-8 top-8 p-2 text-slate-400 hover:text-primary transition-colors hover:bg-slate-50 rounded-xl"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-primary/10 text-primary text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest">
                  AY {training.academicYear}
                </span>
                <span className="bg-slate-50 text-slate-400 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest">
                  New Reservation
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight">
                Secure Your Spot
              </h2>
            </div>

            {/* Content */}
            <div className="p-10 space-y-8">
              {/* Training Summary Card */}
              <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 flex flex-col gap-6">
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  {training.title}
                </h3>
                
                <div className="grid grid-cols-2 gap-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-primary" />
                    <span className="text-sm font-bold text-slate-600">
                      {training.date.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-primary" />
                    <span className="text-sm font-bold text-slate-600">{training.startTime} - {training.endTime}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-3">
                    <MapPin size={18} className="text-primary" />
                    <span className="text-sm font-bold text-slate-600 truncate">{training.location}</span>
                  </div>
                </div>
              </div>

              {/* User Profile Summary */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-slate-400">
                  <ShieldCheck size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Requester Identity</span>
                </div>
                <div className="flex items-center gap-4 bg-white border border-slate-100 p-4 rounded-3xl shadow-sm">
                  <img 
                    src={userProfile?.photoURL || ''} 
                    alt="Profile" 
                    className="w-12 h-12 rounded-2xl border-2 border-primary/10"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{userProfile?.displayName}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400">{userProfile?.staffId}</span>
                      <span className="text-[8px] text-slate-300">•</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{userProfile?.department}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-4">
                <button
                  disabled={loading}
                  onClick={handleBooking}
                  className="w-full btn-primary py-6 rounded-[2rem] text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Confirm Reservation</span>
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">
                  By confirming, you agree to attend the full session
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
