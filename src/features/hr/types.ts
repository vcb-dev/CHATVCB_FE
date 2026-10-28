export interface EmployeeChild {
  fullName: string;
  dateOfBirth?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface GuardianInfo {
  name: string;
  phone: string;
  occupation?: string;
}

export interface BankAccountInfo {
  bankName: string;
  accountNumber: string;
  branch: string;
}

export interface EmployeeProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  startDate: string;
  employeeCode: string;
  employeeSeq: string;
  contractType: string;
  jobTitle: string;
  directManagerName: string;
  employmentStatus: string;
  cardColor: string;
  managementBlockCode: string;
  department: string;
  departmentGroup: string;
  specialtyPosition: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  permanentAddress: string;
  educationLevel: string;
  schoolName: string;
  citizenIdNumber: string;
  citizenIdIssuedPlace: string;
  citizenIdFrontUrl?: string;
  citizenIdBackUrl?: string;
  maritalStatus: string;
  ethnicity: string;
  religion: string;
  socialInsuranceNumber: string;
  children: EmployeeChild[];
  emergencyContact: EmergencyContact;
  guardianFather: GuardianInfo;
  guardianMother: GuardianInfo;
  bankAccount: BankAccountInfo;
  vehicles: string;
  isActive: boolean;
}

export type EmployeeListRow = Pick<
  EmployeeProfile,
  | "id"
  | "fullName"
  | "email"
  | "employeeCode"
  | "department"
  | "departmentGroup"
  | "jobTitle"
  | "directManagerName"
  | "startDate"
  | "employmentStatus"
  | "cardColor"
  | "contractType"
  | "isActive"
>;
