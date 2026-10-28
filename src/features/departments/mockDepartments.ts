import type { OrgDepartment } from './types';

/** Demo cấu trúc phòng ban / nhóm — sau này thay bằng API. */
export const MOCK_ORG_DEPARTMENTS: OrgDepartment[] = [
  {
    id: 'dept-hckt',
    name: 'Hành chính - Kế toán',
    code: 'HANH_CHINH_KE_TOAN',
    status: 'active',
    groups: [
      {
        id: 'grp-hcns',
        name: 'Hành chính nhân sự',
        leaderName: null,
        memberCount: 2,
        status: 'active',
      },
      {
        id: 'grp-kcth',
        name: 'Kế toán tổng hợp',
        leaderName: 'Nguyễn Thu Hà',
        memberCount: 4,
        status: 'active',
      },
      {
        id: 'grp-kctt',
        name: 'Kế toán thanh toán',
        leaderName: 'Trần Minh Quân',
        memberCount: 7,
        status: 'active',
      },
    ],
  },
  {
    id: 'dept-mkt',
    name: 'Phòng Marketing',
    code: 'PHONG_MARKETING',
    status: 'active',
    groups: [
      {
        id: 'grp-traffic',
        name: 'Nhóm Traffic',
        leaderName: 'Lê Phương Anh',
        memberCount: 9,
        status: 'active',
      },
      {
        id: 'grp-brand',
        name: 'Nhóm Thương hiệu',
        leaderName: null,
        memberCount: 5,
        status: 'active',
      },
      {
        id: 'grp-content',
        name: 'Nhóm Nội dung',
        leaderName: 'Võ Đức Long',
        memberCount: 6,
        status: 'active',
      },
    ],
  },
  {
    id: 'dept-sales',
    name: 'Phòng Kinh doanh',
    code: 'PHONG_KINH_DOANH',
    status: 'active',
    groups: [
      {
        id: 'grp-b2b-n',
        name: 'Nhóm B2B Miền Bắc',
        leaderName: 'Phạm Hoàng Nam',
        memberCount: 18,
        status: 'active',
      },
      {
        id: 'grp-b2b-s',
        name: 'Nhóm B2B Miền Nam',
        leaderName: null,
        memberCount: 14,
        status: 'active',
      },
      {
        id: 'grp-b2c',
        name: 'Nhóm B2C',
        leaderName: 'Hoàng Thị Mai',
        memberCount: 22,
        status: 'active',
      },
      {
        id: 'grp-cs',
        name: 'Chăm sóc khách hàng',
        leaderName: 'Đặng Quốc Bảo',
        memberCount: 11,
        status: 'active',
      },
    ],
  },
  {
    id: 'dept-wh',
    name: 'Phòng Kho vận',
    code: 'PHONG_KHO_VAN',
    status: 'active',
    groups: [
      {
        id: 'grp-inbound',
        name: 'Nhập kho',
        leaderName: null,
        memberCount: 8,
        status: 'active',
      },
      {
        id: 'grp-outbound',
        name: 'Xuất kho & giao hàng',
        leaderName: 'Bùi Văn Tài',
        memberCount: 15,
        status: 'active',
      },
    ],
  },
  {
    id: 'dept-hr',
    name: 'Phòng Nhân sự',
    code: 'PHONG_NHAN_SU',
    status: 'active',
    groups: [
      {
        id: 'grp-hr-ops',
        name: 'HR Operations',
        leaderName: 'Nguyễn Thị Lan',
        memberCount: 4,
        status: 'active',
      },
      {
        id: 'grp-td',
        name: 'Tuyển dụng',
        leaderName: null,
        memberCount: 3,
        status: 'active',
      },
      {
        id: 'grp-cb',
        name: 'C&B',
        leaderName: 'Trịnh Minh Khoa',
        memberCount: 2,
        status: 'active',
      },
    ],
  },
  {
    id: 'dept-it',
    name: 'Phòng Công nghệ',
    code: 'PHONG_CNTT',
    status: 'active',
    groups: [
      {
        id: 'grp-product',
        name: 'Sản phẩm & UX',
        leaderName: 'Lý Hữu Phúc',
        memberCount: 7,
        status: 'active',
      },
      {
        id: 'grp-be',
        name: 'Backend',
        leaderName: null,
        memberCount: 9,
        status: 'active',
      },
      {
        id: 'grp-fe',
        name: 'Frontend',
        leaderName: 'Vũ Ngọc Linh',
        memberCount: 6,
        status: 'active',
      },
      {
        id: 'grp-devops',
        name: 'DevOps',
        leaderName: 'Cao Đình Huy',
        memberCount: 4,
        status: 'inactive',
      },
    ],
  },
  {
    id: 'dept-prod',
    name: 'Phòng Sản xuất',
    code: 'PHONG_SAN_XUAT',
    status: 'inactive',
    groups: [
      {
        id: 'grp-line1',
        name: 'Dây chuyền 1',
        leaderName: null,
        memberCount: 45,
        status: 'inactive',
      },
      {
        id: 'grp-line2',
        name: 'Dây chuyền 2',
        leaderName: 'Đinh Quốc Thắng',
        memberCount: 38,
        status: 'inactive',
      },
      {
        id: 'grp-qc',
        name: 'Kiểm soát chất lượng',
        leaderName: null,
        memberCount: 12,
        status: 'inactive',
      },
    ],
  },
];

export function orgDepartmentOptions() {
  return MOCK_ORG_DEPARTMENTS.filter((d) => d.status === 'active').map((d) => ({
    value: d.name,
    label: d.name,
    code: d.code,
  }));
}

export function orgGroupOptionsForDepartment(departmentName: string) {
  const dept = MOCK_ORG_DEPARTMENTS.find((d) => d.name === departmentName);
  if (!dept) return [];
  return dept.groups
    .filter((g) => g.status === 'active')
    .map((g) => ({ value: g.name, label: g.name }));
}
