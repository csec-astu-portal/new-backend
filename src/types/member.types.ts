import { MemberStatus } from './user.types';
import { RoleType } from './role.types';

export type Member = {
  id: string;
  freeName: string;
  fullName?: string; // Added for UI consistency, same value as freeName
  email: string;
  studentId: string; // Format: UGR/#####/##
  gmailId: string;
  contact: string;
  note: string;
  expectedGenerationYear: string;
  discoveredDate: string;
  fieldOfStudy: string;
  unifiedById: string; // Format: UGR/#####/##
  passwordLink: string;
  statusDates: string;
  customerStatusLink: string;
  adminLink: string;
  personalStatusLink: string;
  shortListDescription: string;
  
  // Optional fields
  lastName?: string;
  firstAddress?: string;
  alternateEmail?: string;
  githubProfile?: string;
  supportHandle?: string;
  successions?: string;
  skills?: string[];
  historyNotes?: string;
  
  // System fields
  password: string;
  role: RoleType;
  divisionId?: string;
  status: MemberStatus;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MemberWithDivision = Member & {
  division?: {
    id: string;
    name: string;
  };
};

export type MemberListItem = Pick<Member, 
  'id' | 
  'freeName' | 
  'fullName' |
  'email' | 
  'studentId' | 
  'contact' | 
  'role' | 
  'status' | 
  'fieldOfStudy' | 
  'expectedGenerationYear'
>;