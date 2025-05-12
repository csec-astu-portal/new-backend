import { RoleType } from "../types/role.types";

interface RolePermissions {
  canManageDivisions: boolean;
  canManageMembers: boolean;
  canManageHeads: boolean;
  canViewAllMembers: boolean;
  canViewDivisionMembers: boolean;
  canManageOwnProfile: boolean;
  canManageDivisionMembers: boolean;
}

const rolePermissions: Record<RoleType, RolePermissions> = {
  [RoleType.PRESIDENT]: {
    canManageDivisions: true,
    canManageMembers: true,
    canManageHeads: true,
    canViewAllMembers: true,
    canViewDivisionMembers: true,
    canManageOwnProfile: true,
    canManageDivisionMembers: true
  },
  [RoleType.CPD_HEAD]: {
    canManageDivisions: false,
    canManageMembers: false,
    canManageHeads: false,
    canViewAllMembers: false,
    canViewDivisionMembers: true,
    canManageOwnProfile: true,
    canManageDivisionMembers: true
  },
  [RoleType.CBD_HEAD]: {
    canManageDivisions: false,
    canManageMembers: false,
    canManageHeads: false,
    canViewAllMembers: false,
    canViewDivisionMembers: true,
    canManageOwnProfile: true,
    canManageDivisionMembers: true
  },
  [RoleType.CYBER_HEAD]: {
    canManageDivisions: false,
    canManageMembers: false,
    canManageHeads: false,
    canViewAllMembers: false,
    canViewDivisionMembers: true,
    canManageOwnProfile: true,
    canManageDivisionMembers: true
  },
  [RoleType.DEV_HEAD]: {
    canManageDivisions: false,
    canManageMembers: false,
    canManageHeads: false,
    canViewAllMembers: false,
    canViewDivisionMembers: true,
    canManageOwnProfile: true,
    canManageDivisionMembers: true
  },
  [RoleType.DATA_SCIENCE_HEAD]: {
    canManageDivisions: false,
    canManageMembers: false,
    canManageHeads: false,
    canViewAllMembers: false,
    canViewDivisionMembers: true,
    canManageOwnProfile: true,
    canManageDivisionMembers: true
  },
  [RoleType.MEMBER]: {
    canManageDivisions: false,
    canManageMembers: false,
    canManageHeads: false,
    canViewAllMembers: false,
    canViewDivisionMembers: false,
    canManageOwnProfile: true,
    canManageDivisionMembers: false
  }
};

export const getRolePermissions = (role: RoleType): RolePermissions => {
  return rolePermissions[role] || rolePermissions[RoleType.MEMBER];
};

export const isPresident = (role: RoleType): boolean => {
  return role === RoleType.PRESIDENT;
};

export const isDivisionHead = (role: RoleType | RoleType[]): boolean => {
  const divisionHeadRoles: RoleType[] = [
    RoleType.CPD_HEAD,
    RoleType.CBD_HEAD,
    RoleType.CYBER_HEAD,
    RoleType.DEV_HEAD,
    RoleType.DATA_SCIENCE_HEAD
  ];
  
  if (Array.isArray(role)) {
    // Check if any of the roles is a division head role
    return role.some(r => divisionHeadRoles.includes(r));
  }
  
  // Check if the single role is a division head role
  return divisionHeadRoles.includes(role);
};

export const isMember = (role: RoleType): boolean => {
  return role === RoleType.MEMBER;
};

export const canManageDivision = (role: RoleType): boolean => {
  return isPresident(role) || isDivisionHead(role);
};

export const canManageMembers = (role: RoleType): boolean => {
  return isPresident(role) || isDivisionHead(role);
};

export const canViewAllMembers = (role: RoleType): boolean => {
  return isPresident(role);
};

export const canViewDivisionMembers = (role: RoleType): boolean => {
  return isPresident(role) || isDivisionHead(role);
};

export const canManageDivisionMembers = (role: RoleType): boolean => {
  return isDivisionHead(role);
}; 