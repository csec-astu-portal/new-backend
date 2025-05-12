import { RoleType } from './role.types';

export type User = {
  id: string;
  freeName: string;
  fullName?: string; // Added for UI consistency, same value as freeName
  lastName?: string;
  email: string;
  password: string;
  studentId: string;
  gmailId: string;
  contact: string;
  firstAddress?: string;
  alternateEmail?: string;
  note: string;
  expectedGenerationYear: string;
  discoveredDate: string;
  fieldOfStudy: string;
  unifiedById: string;
  passwordLink: string;
  statusDates: string;
  customerStatusLink: string;
  adminLink: string;
  personalStatusLink: string;
  shortListDescription: string;
  profileImage?: string;
  githubProfile?: string;
  supportHandle?: string;
  successions?: string;
  skills?: string;
  historyNotes?: string;
  role: RoleType;
  divisionId?: string | null;
  isEmailVerified: boolean;
  status: MemberStatus;
  createdAt: Date;
  updatedAt: Date;
};

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BANNED = 'BANNED',
  WITHDRAWN = 'WITHDRAWN' // For members who have been removed from a division
}
