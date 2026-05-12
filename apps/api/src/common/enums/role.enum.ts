export enum Role {
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
  ACCOUNT_MANAGER = 'ACCOUNT_MANAGER',
  VIEWER = 'VIEWER',
}

export const ALL_ROLES: Role[] = [
  Role.ADMIN,
  Role.FINANCE,
  Role.ACCOUNT_MANAGER,
  Role.VIEWER,
];
