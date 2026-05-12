import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Users, ChevronRight, XCircle, MapPin, Clock } from 'lucide-react';
import { Training } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { BookingModal } from './BookingModal';
import { useAuth } from '@/src/lib/AuthContext';
import { useNavigate } from 'react-router-dom';

interface TrainingCardProps {
  training: Training;
  index: number;
}

export const TrainingCard: React.FC<TrainingCardProps> = ({ training, index }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const seatsRemaining = training.capacity - training.currentBookings;
  const progressValue = (training.currentBookings / training.capacity) * 100;
  
  const formattedDate = training.date.toDate().toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const handleReserveClick = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ y: -6 }}
        className="card-premium h-full flex flex-col group border border-slate-100 hover:shadow-2xl hover:shadow-primary/5 transition-all"
      >
        <div className="relative aspect-[3/4] -mx-8 -mt-8 mb-6 overflow-hidden bg-slate-900 border-b border-slate-100">
          {training.posterUrl ? (
            <img 
              src={training.posterUrl} 
              alt={training.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary to-transparent" />
              </div>
              <Calendar size={48} className="text-white/20" />
            </div>
          )}
          
          <div className="absolute top-6 left-6 z-10">
            <span className="bg-primary/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-lg">
              AY {training.academicYear}
            </span>
          </div>
          <div className="absolute bottom-4 left-8 text-white/70 text-[9px] font-black uppercase tracking-[0.2em] z-10 drop-shadow-md">
            Bangkok University
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {training.targetRoles.slice(0, 2).map((role, i) => (
              <span key={i} className="text-[9px] font-black uppercase bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded tracking-wider">
                {role}
              </span>
            ))}
            {training.targetRoles.length > 2 && (
              <span className="text-[9px] font-black uppercase bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded tracking-wider">
                +{training.targetRoles.length - 2} More
              </span>
            )}
          </div>

          <h3 className="text-xl font-black text-slate-900 leading-tight mb-4 group-hover:text-primary transition-colors line-clamp-2">
            {training.title}
          </h3>
          
          <div className="mt-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={14} className="text-primary/40" />
                <span className="text-xs font-bold text-slate-600">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Clock size={14} className="text-primary/40" />
                <span className="text-xs font-bold text-slate-600">{training.startTime} - {training.endTime}</span>
              </div>
              <div className="col-span-2 flex items-center gap-2 text-slate-500">
                <MapPin size={14} className="text-primary/40" />
                <span className="text-[11px] font-medium text-slate-500 truncate">{training.location}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Users size={14} className={cn(seatsRemaining > 0 ? "text-accent" : "text-slate-400")} />
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider",
                    seatsRemaining > 0 ? "text-slate-900" : "text-slate-400 italic"
                  )}>
                    {seatsRemaining > 0 ? `${seatsRemaining} Seats Remaining` : "Registration Full"}
                  </span>
                </div>
                <span className="text-[10px] font-black text-slate-400">{training.currentBookings}/{training.capacity}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressValue}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={cn(
                    "h-full transition-all duration-500",
                    progressValue > 90 ? "bg-primary" : "bg-accent"
                  )}
                />
              </div>
            </div>
            
            <div className="pt-2">
              <button 
                onClick={handleReserveClick}
                disabled={seatsRemaining <= 0}
                className={cn(
                  "w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                  seatsRemaining > 0 
                    ? "bg-slate-900 text-white hover:bg-primary shadow-lg shadow-slate-900/10" 
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
              >
                {seatsRemaining > 0 ? (
                  <>
                    <span>Reserve Seat</span>
                    <ChevronRight size={14} />
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    <span>Session Full</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <BookingModal 
        training={training}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
