import * as XLSX from 'xlsx';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Booking, Training } from '../types';

export const exportTrainingData = async (trainingId: string, trainingTitle: string) => {
  try {
    // 1. Fetch Approved Bookings
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('trainingId', '==', trainingId),
      where('status', '==', 'confirmed')
    );
    const bookingsSnap = await getDocs(bookingsQuery);
    const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];

    if (bookings.length === 0) {
      throw new Error('ไม่พบรายชื่อผู้เข้าอบรมที่ได้รับการยืนยัน');
    }

    // 2. Join Staff Details
    // We'll fetch from 'users' collection first as it contains the staff metadata for the actual attendee
    // If not found or incomplete, we could fallback to staff_master, but users is more direct for current participants
    const exportData = await Promise.all(bookings.map(async (booking, index) => {
      const userRef = doc(db, 'users', booking.userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : null;

      // Also try staff_master if user data is missing staff information
      let staffData = null;
      if (userData?.email) {
        const staffQuery = query(collection(db, 'staff_master'), where('email', '==', userData.email));
        const staffSnap = await getDocs(staffQuery);
        if (!staffSnap.empty) {
          staffData = staffSnap.docs[0].data();
        }
      }

      const displayName = userData?.displayName || staffData?.displayName || 'ไม่พบข้อมูล';
      const staffId = userData?.staffId || staffData?.staffId || 'ไม่พบข้อมูล';
      const department = userData?.department || staffData?.department || 'ไม่พบข้อมูล';
      const position = userData?.position || staffData?.position || 'ไม่พบข้อมูล';
      const email = userData?.email || staffData?.email || 'ไม่พบข้อมูล';

      return {
        'ลำดับ': index + 1,
        'รหัสบุคลากร': staffId,
        'ชื่อ-นามสกุล': displayName,
        'สังกัด/ภาควิชา': department,
        'ตำแหน่ง': position,
        'อีเมล': email,
        'สถานะการเข้าเรียน': booking.attended ? 'เข้าเรียนแล้ว' : 'ยังไม่ได้เช็คอิน',
        'เวลาที่เช็คอิน': booking.checkInTime ? booking.checkInTime.toDate().toLocaleString('th-TH') : '-'
      };
    }));

    // 3. Create Workbook
    const wb = XLSX.utils.book_new();
    
    // Add Header Rows
    const headerInfo = [
      ['โครงการ:', trainingTitle],
      ['วันที่ส่งออก:', new Date().toLocaleString('th-TH')],
      ['จำนวนผู้เข้าร่วมทั้งหมด:', exportData.length],
      [] // Empty row
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(headerInfo);
    
    // Add custom headers at the top
    XLSX.utils.sheet_add_json(ws, exportData, { origin: 'A5', skipHeader: false });

    // Auto-fit column widths
    const colWidths = [
      { wch: 6 },  // No.
      { wch: 15 }, // Staff ID
      { wch: 30 }, // Name
      { wch: 25 }, // Dept
      { wch: 20 }, // Position
      { wch: 30 }, // Email
      { wch: 20 }, // Attendance
      { wch: 25 }  // Check-in Time
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อผู้เข้าอบรม');

    // 4. Generate Filename & Save
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `รายชื่อผู้เข้าอบรม_${trainingTitle}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);

    return true;
  } catch (error: any) {
    console.error('Export Error:', error);
    throw error;
  }
};
