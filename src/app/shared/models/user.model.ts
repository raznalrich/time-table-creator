export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher';
  teacherId?: string;
}

export type AppUser = User;