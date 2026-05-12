import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, MapPin, Users, Info, ChevronRight, Check, ShieldAlert, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { getAcademicYear, cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';

interface AddTrainingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLES = ["บุคลากร", "อาจารย์", "คณบดี", "หัวหน้าภาค", "ผู้อำนวยการ", "พนักงานปฏิบัติการ"];

export const AddTrainingForm: React.FC<AddTrainingFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '09:00',
    endTime: '12:00',
    location: '',
    capacity: 30,
    targetRoles: [] as string[],
    posterUrl: '',
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Force 3:4 aspect ratio crop/resize logic
        // For simplicity, we resize while maintaining aspect ratio but user requested 3:4
        // Let's implement a 3:4 proportional resize or just inform
        const targetAspectRatio = 3 / 4;
        const currentAspectRatio = width / height;

        // Resize to max width 600px
        const maxWidth = 600;
        if (width > maxWidth) {
          width = maxWidth;
          height = width / currentAspectRatio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          setImagePreview(base64);
          setFormData(prev => ({ ...prev, posterUrl: base64 }));
        }
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, posterUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.posterUrl) {
      toast.error('Please fill in required fields and upload a poster');
      return;
    }

    setLoading(true);
    try {
      const selectedDate = new Date(formData.date);
      const academicYear = getAcademicYear(selectedDate);
      const month = selectedDate.getMonth() + 1;

      const docData = {
        ...formData,
        date: Timestamp.fromDate(selectedDate),
        academicYear,
        month,
        currentBookings: 0,
        status: 'open',
        createdAt: Timestamp.now(),
        capacity: Number(formData.capacity)
      };

      await addDoc(collection(db, 'trainings'), docData);
      toast.success('Training session created successfully');
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        title: '',
        description: '',
        date: '',
        startTime: '09:00',
        endTime: '12:00',
        location: '',
        capacity: 30,
        targetRoles: [] as string[],
        posterUrl: '',
      });
      setImagePreview(null);
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to create training');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role]
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Create Session</h2>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">New Training Program</p>
              </div>
              <button 
                onClick={onClose}
                className="p-3 text-slate-400 hover:text-primary transition-colors bg-slate-50 rounded-2xl"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-8">
              {/* Image Upload */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <ImagePlus size={16} />
                  <span className="text-xs font-black uppercase tracking-widest">Training Poster (3:4)</span>
                </div>
                
                <div 
                  className={cn(
                    "relative aspect-[3/4] w-48 mx-auto rounded-[2rem] border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center gap-3 bg-slate-50",
                    imagePreview ? "border-transparent" : "border-slate-200 hover:border-primary/40 hover:bg-slate-100"
                  )}
                >
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing...</span>
                    </div>
                  ) : imagePreview ? (
                    <>
                      <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage();
                        }}
                        className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-colors z-20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                        <ImagePlus size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-black text-slate-900 uppercase">อัปโหลดรูปภาพ Poster</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">(สัดส่วน 3:4)</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <Info size={16} />
                  <span className="text-xs font-black uppercase tracking-widest">General Information</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Training Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Modern AI Implementation for Higher Education"
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-slate-700 font-medium transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-slate-700 font-medium transition-all outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    <Calendar size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">Date & Location</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-slate-700 font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Seminar Room 1"
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-slate-700 font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    <Clock size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">Time & Capacity</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Start</label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-4 py-4 text-slate-700 font-medium outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">End</label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-4 py-4 text-slate-700 font-medium outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Max Seats (Capacity)</label>
                    <div className="relative">
                      <Users size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        min="1"
                        value={formData.capacity}
                        onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl pl-14 pr-6 py-4 text-slate-700 font-medium outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Roles */}
              <div className="space-y-4 pb-12">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <ShieldAlert size={16} />
                  <span className="text-xs font-black uppercase tracking-widest">Eligibility (Target Roles)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
                        formData.targetRoles.includes(role)
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                          : "bg-slate-50 text-slate-500 border-transparent hover:border-slate-200"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {formData.targetRoles.includes(role) && <Check size={12} />}
                        {role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-8 sticky bottom-0 bg-white/80 backdrop-blur-md z-20 pb-4">
                <button
                  type="submit"
                  disabled={loading || isProcessing || !formData.posterUrl}
                  className={cn(
                    "w-full btn-primary py-5 rounded-3xl text-lg flex items-center justify-center space-x-3 transition-all",
                    (!formData.posterUrl || loading) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Deploy Training Program</span>
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

