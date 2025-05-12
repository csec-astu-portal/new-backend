import { User } from './user.types';

export type Division = {
  id: string;
  // Map the database field 'name' to 'freeName' in our TypeScript code
  freeName: string; // This corresponds to 'name' in the Prisma schema
  fullName?: string; // Added for UI consistency, same value as freeName
  description: string | null;
  headId: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Original database field, included for compatibility
  name?: string;
};

export interface DivisionWithDetails extends Division {
  head: (Pick<User, "id" | "freeName" | "email"> & { fullName?: string }) | null;
  members: (Pick<User, "id" | "freeName" | "email" | "role"> & { fullName?: string })[];
}
