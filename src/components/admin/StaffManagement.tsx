import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Upload, User, Plus, Trash2, FileText, Download, UserPlus, Table } from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

interface StaffRecord {
  id?: string;
  email: string;
  displayName: string;
  staffId: string;
  department: string;
  position: string;
}

export const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'staff_master'), orderBy('displayName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StaffRecord[];
      setStaff(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,StaffID,Department,Position,Email\nสมชาย ใจดี,60xxxxxx,คณะวิศวกรรมศาสตร์,อาจารย์ประจำ,somchai.j@bu.ac.th";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "staff_master_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: async (results) => {
        console.log('Parsed CSV results:', results);
        
        try {
          if (results.data.length === 0) {
            toast.error('ไม่พบข้อมูลในไฟล์ CSV');
            setUploading(false);
            return;
          }

          // Header Normalization Mapping
          const headerMap: Record<string, keyof StaffRecord> = {
            // Name
            'name': 'displayName',
            'displayname': 'displayName',
            'ชื่อ': 'displayName',
            'ชื่อ-นามสกุล': 'displayName',
            'ชื่อจริง': 'displayName',
            // Staff ID
            'staffid': 'staffId',
            'id': 'staffId',
            'รหัสบุคลากร': 'staffId',
            'รหัสพนักงาน': 'staffId',
            'รหัสอาจารย์': 'staffId',
            // Department
            'department': 'department',
            'dept': 'department',
            'สังกัด': 'department',
            'คณะ': 'department',
            'หน่วยงาน': 'department',
            'สังกัด/ภาควิชา': 'department',
            // Position
            'position': 'position',
            'ตำแหน่ง': 'position',
            // Email
            'email': 'email',
            'อีเมล': 'email',
            'อีเมล์': 'email',
          };

          const availableHeaders = results.meta.fields || [];
          const normalizedMapping: Record<Exclude<keyof StaffRecord, 'id'>, string | null> = {
            displayName: null,
            staffId: null,
            department: null,
            position: null,
            email: null,
          };

          // Find which column matches which field
          availableHeaders.forEach(header => {
            const normalizedHeader = header.toLowerCase().trim();
            const field = headerMap[normalizedHeader];
            if (field) {
              normalizedMapping[field] = header;
            }
          });

          // Check for required fields
          const missingFields = [];
          if (!normalizedMapping.email) missingFields.push('อีเมล');
          if (!normalizedMapping.staffId) missingFields.push('รหัสบุคลากร');
          if (!normalizedMapping.displayName) missingFields.push('ชื่อ-นามสกุล');

          if (missingFields.length > 0) {
            toast.error(`ไม่พบคอลัมน์ที่จำเป็น: ${missingFields.join(', ')} ในไฟล์ของคุณ กรุณาตรวจสอบ Header`);
            setUploading(false);
            return;
          }

          const batch = writeBatch(db);
          let count = 0;

          results.data.forEach((row: any) => {
            const staffRecord: StaffRecord = {
              displayName: (normalizedMapping.displayName ? row[normalizedMapping.displayName] : '').toString().trim(),
              staffId: (normalizedMapping.staffId ? row[normalizedMapping.staffId] : '').toString().trim(),
              department: (normalizedMapping.department ? row[normalizedMapping.department] : 'ไม่ระบุ').toString().trim(),
              position: (normalizedMapping.position ? row[normalizedMapping.position] : 'เจ้าหน้าที่').toString().trim(),
              email: (normalizedMapping.email ? row[normalizedMapping.email] : '').toString().trim().toLowerCase()
            };

            if (staffRecord.email && staffRecord.staffId) {
              const docRef = doc(db, 'staff_master', staffRecord.staffId);
              batch.set(docRef, staffRecord);
              count++;
            }
          });

          if (count > 0) {
            await batch.commit();
            toast.success(`นำเข้าข้อมูลบุคลากรสำเร็จ ${count} รายการ`);
          } else {
            toast.error('ไม่พบข้อมูลที่ถูกต้องสำหรับนำเข้า');
          }
        } catch (error) {
          console.error(error);
          toast.error('Failed to import staff data');
        } finally {
          setUploading(false);
          e.target.value = '';
        }
      },
      error: (error) => {
        toast.error('CSV Parsing Error: ' + error.message);
        setUploading(false);
      }
    });
  };

  const handleDelete = async (staffId: string) => {
    if (confirm('Delete this staff record?')) {
      try {
        await deleteDoc(doc(db, 'staff_master', staffId));
        toast.success('Record removed');
      } catch (error) {
        toast.error('Failed to delete');
      }
    }
  };

  const filteredStaff = staff.filter(s => 
    s.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.staffId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Staff Master Reference</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verified Faculty & Staff Database</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all"
            title="Download CSV Template"
          >
            <Download size={18} />
          </button>
          
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search database..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          
          <label className={cn(
            "flex items-center gap-2 cursor-pointer btn-primary !py-3 !px-6 transition-all",
            uploading && "opacity-50 pointer-events-none"
          )}>
            <Upload size={18} />
            <span className="text-xs font-black uppercase tracking-widest">Import CSV</span>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Staff List Table */}
      <div className="card-premium !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50">
                <th className="px-8 py-6">Identity</th>
                <th className="px-6 py-6">ID & Dept</th>
                <th className="px-6 py-6">Position</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <AnimatePresence mode="popLayout">
                {filteredStaff.map((person) => (
                  <motion.tr 
                    key={person.staffId}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                          <User size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 leading-tight uppercase truncate max-w-[200px]">{person.displayName}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{person.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 font-medium text-slate-600">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{person.staffId}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase">{person.department}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-wider">
                        {person.position}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => handleDelete(person.staffId)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white border border-slate-100 rounded-xl shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredStaff.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-300 italic font-medium">
                    No staff records in master database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Blueprint Helpful Info */}
      <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 border-dashed">
        <FileText size={20} className="text-slate-400 mt-1" />
        <div>
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">CSV Import Support (Thai & English)</h4>
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            The system supports both Thai and English headers. Recommended columns: <br />
            <span className="text-primary font-black">ชื่อ (Name), รหัสบุคลากร (Staff ID), สังกัด (Department), ตำแหน่ง (Position), อีเมล (Email)</span>
          </p>
          <button 
            onClick={downloadTemplate}
            className="mt-3 text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
          >
            <Download size={12} />
            Download Standard Template
          </button>
        </div>
      </div>
    </div>
  );
};
