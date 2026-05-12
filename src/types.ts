import { Timestamp } from 'firebase/firestore';

export interface Training {
  id: string;
  title: string;
  description: string;
  date: Timestamp;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  currentBookings: number;
  targetRoles: string[];
  academicYear: string;
  month: number;
  status: 'open' | 'closed' | 'full';
  posterUrl?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: 'staff' | 'admin';
  department?: string;
  position?: string;
  staffId?: string;
  createdAt: Timestamp;
}

export interface Booking {
  id: string;
  trainingId: string;
  userId: string;
  status: 'confirmed' | 'cancelled' | 'pending';
  bookingDate: Timestamp;
  attended?: boolean;
  checkInTime?: Timestamp;
  trainingSnapshot: {
    title: string;
    date: Timestamp;
    startTime: string;
    endTime: string;
    location: string;
  };
}
