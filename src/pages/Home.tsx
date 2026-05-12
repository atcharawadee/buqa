import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, Rocket, GraduationCap, Clock, MapPin, Inbox } from 'lucide-react';
import { TrainingCard } from '@/src/components/TrainingCard';
import { Training } from '@/src/types';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { getAcademicYear, cn } from '@/src/lib/utils';

const MONTHS = [
  { id: 8, name: 'สิงหาคม (August)' },
  { id: 9, name: 'กันยายน (September)' },
  { id: 10, name: 'ตุลาคม (October)' },
  { id: 11, name: 'พฤศจิกายน (November)' },
  { id: 12, name: 'ธันวาคม (December)' },
  { id: 1, name: 'มกราคม (January)' },
  { id: 2, name: 'กุมภาพันธ์ (February)' },
  { id: 3, name: 'มีนาคม (March)' },
  { id: 4, name: 'เมษายน (April)' },
  { id: 5, name: 'พฤษภาคม (May)' },
  { id: 6, name: 'มิถุนายน (June)' },
  { id: 7, name: 'กรกฎาคม (July)' },
];

export const Home: React.FC = () => {
  const currentAY = getAcademicYear(new Date());
  
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedYear, setSelectedYear] = useState(currentAY);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'trainings'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Training[];
      setTrainings(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(currentAY);
    trainings.forEach(t => years.add(t.academicYear));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [trainings, currentAY]);

  const filteredTrainings = useMemo(() => {
    return trainings.filter(t => {
      const matchesYear = t.academicYear === selectedYear;
      const matchesMonth = selectedMonth === 'all' || t.month === selectedMonth;
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesYear && matchesMonth && matchesSearch;
    });
  }, [trainings, selectedYear, selectedMonth, searchTerm]);

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-slate-50 pt-16 pb-12 px-4 shadow-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 shadow-sm"
          >
            <Rocket size={12} className="text-primary" />
            <span>Bangkok University Training Excellence</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl lg:text-7xl font-black text-slate-900 mb-6 leading-tight uppercase tracking-tighter"
          >
            Empower Your <br /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">Academic Journey</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed mb-12 font-medium"
          >
            ยกระดับทักษะและความเป็นมืออาชีพด้วยโปรแกรมการอบรม <br /> สำหรับคณาจารย์และบุคลากรสายสนับสนุน มหาวิทยาลัยกรุงเทพ
          </motion.p>
          
          {/* Enhanced Filter Bar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-4xl mx-auto bg-white p-2 rounded-[2.5rem] shadow-premium border border-slate-100 flex flex-wrap lg:flex-nowrap items-center divide-y lg:divide-y-0 lg:divide-x divide-slate-100"
          >
            <div className="flex-1 w-full lg:w-auto p-4 min-w-[200px]">
              <div className="flex flex-col items-start gap-1 ml-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Academic Year</span>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full appearance-none bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>ปีการศึกษา {year}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex-1 w-full lg:w-auto p-4 min-w-[200px]">
              <div className="flex flex-col items-start gap-1 ml-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Month</span>
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value) || 'all')}
                  className="w-full appearance-none bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                >
                  <option value="all">ทุกช่วงเวลา (All Months)</option>
                  {MONTHS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-[1.5] w-full lg:w-auto p-4 flex items-center gap-3">
              <Search className="text-slate-300 ml-4" size={20} />
              <input 
                type="text" 
                placeholder="Search by training title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent font-bold text-slate-900 outline-none placeholder:text-slate-300"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase">Available Trainings</h2>
            <p className="text-slate-500 mt-2 font-medium">Explore professional development opportunities for AY {selectedYear}</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Live Results: {filteredTrainings.length} Programs</span>
          </div>
        </div>

        {/* Dynamic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="card-premium h-96 animate-pulse bg-slate-50 border-slate-100" />
            ))
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredTrainings.length > 0 ? (
                filteredTrainings.map((training, index) => (
                  <TrainingCard key={training.id} training={training} index={index} />
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="col-span-1 md:col-span-2 lg:col-span-3 py-24 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200"
                >
                  <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm flex items-center justify-center text-slate-200 mx-auto mb-6">
                    <Inbox size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase mb-2">ไม่พบข้อมูลโครงการ</h3>
                  <p className="text-slate-400 font-medium">No training sessions match your current filters. <br /> Try adjusting your search or time selection.</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Help Banner */}
        <div className="mt-32 card-premium bg-slate-900 text-white p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary opacity-20 -mr-20 -mt-20 blur-3xl rounded-full" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h3 className="text-3xl font-black uppercase mb-4 tracking-tight">Need technical support?</h3>
              <p className="text-slate-400 font-medium max-w-xl">If you encounter any issues with the training registration system or need specialized training for your department, please contact the BUQA team.</p>
            </div>
            <button className="bg-white text-slate-900 px-10 py-5 rounded-[2rem] font-black uppercase text-sm hover:bg-primary hover:text-white transition-all shadow-xl shadow-white/5 whitespace-nowrap">
              Contact Administrator
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
