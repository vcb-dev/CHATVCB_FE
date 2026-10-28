import { avatarColor, initials } from "@/lib/avatar";
import { ExportOutlined, PlusOutlined, TeamOutlined } from "@ant-design/icons";
import {
  Avatar,
  Button,
  Input,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import type { EmployeeProfile } from "./types";

interface Props {
  employees: EmployeeProfile[];
  onOpen: (id: string) => void;
}

export function EmployeeListView({ employees, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState<string | null>(null);
  const [contract, setContract] = useState<string | null>(null);
  const [employmentStatus, setEmploymentStatus] = useState<string | null>(null);

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department))].sort(),
    [employees],
  );
  const contracts = useMemo(
    () => [...new Set(employees.map((e) => e.contractType))].sort(),
    [employees],
  );
  const employmentStatuses = useMemo(
    () => [...new Set(employees.map((e) => e.employmentStatus))].sort(),
    [employees],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((item) => {
      if (department && item.department !== department) return false;
      if (contract && item.contractType !== contract) return false;
      if (employmentStatus && item.employmentStatus !== employmentStatus)
        return false;
      if (!q) return true;
      return (
        item.fullName.toLowerCase().includes(q) ||
        item.employeeCode.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.includes(q)
      );
    });
  }, [employees, query, department, contract, employmentStatus]);

  const stats = useMemo(
    () => ({
      total: employees.length,
      official: employees.filter((e) => e.contractType.includes("Chính thức"))
        .length,
      departments: departments.length,
      employmentStatuses: employmentStatuses.length,
    }),
    [employees, departments.length],
  );

  const columns: ColumnsType<EmployeeProfile> = [
    {
      title: "Nhân viên",
      key: "name",
      render: (_, row) => (
        <button
          type="button"
          className="hr-table-name"
          onClick={() => onOpen(row.id)}
        >
          <Avatar
            size={40}
            style={{
              background: avatarColor(row.fullName),
              color: "#fff",
              fontWeight: 700,
            }}
          >
            {initials(row.fullName)}
          </Avatar>
          <span>
            <strong>{row.fullName}</strong>
            <small>{row.email}</small>
          </span>
        </button>
      ),
    },
    {
      title: "Mã NV",
      dataIndex: "employeeCode",
      width: 130,
      render: (code: string) => <code className="hr-code">{code}</code>,
    },
    {
      title: "Phòng ban",
      dataIndex: "department",
      ellipsis: true,
    },
    {
      title: "Vị trí",
      dataIndex: "jobTitle",
      ellipsis: true,
    },
    {
      title: "Quản lý",
      dataIndex: "directManagerName",
      ellipsis: true,
      width: 140,
    },
    {
      title: "Vào làm",
      dataIndex: "startDate",
      width: 110,
    },
    {
      title: "Tình trạng làm việc",
      dataIndex: "employmentStatus",
      width: 140,
      ellipsis: true,
      render: (status: string) => {
        switch (status) {
          case "Đang làm việc":
            return <Tag color="green">Đang làm việc</Tag>;
          case "Nghỉ việc":
            return <Tag color="red">Nghỉ việc</Tag>;
          case "Điều chuyển":
            return <Tag color="blue">Điều chuyển</Tag>;
        }
        return <Tag color="gray">{status}</Tag>;
      },
    },
  ];

  return (
    <main className="hr-page">
      <header className="hr-page-head">
        <div>
          <Typography.Text className="hr-eyebrow">HRM</Typography.Text>
          <h1>Nhân sự</h1>
          <p>Quản lý hồ sơ nhân viên — dữ liệu demo để xem giao diện.</p>
        </div>
        <div className="hr-page-actions">
          <Button
            icon={<ExportOutlined />}
            onClick={() => message.info("Export sẽ kết nối API sau.")}
          >
            Export
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => message.info("Thêm nhân viên sẽ kết nối API sau.")}
          >
            Thêm nhân viên
          </Button>
        </div>
      </header>

      <div className="hr-stats">
        <div className="hr-stat">
          <TeamOutlined />
          <div>
            <strong>{stats.total}</strong>
            <span>Tổng nhân viên</span>
          </div>
        </div>
        <div className="hr-stat">
          <strong>{stats.official}</strong>
          <span>Chính thức</span>
        </div>
        <div className="hr-stat">
          <strong>{stats.departments}</strong>
          <span>Phòng ban</span>
        </div>
        <div className="hr-stat">
          <strong>{stats.employmentStatuses}</strong>
          <span>Tình trạng làm việc</span>
        </div>
      </div>

      <div className="hr-filter-card">
        <Input.Search
          allowClear
          placeholder="Tìm mã NV, họ tên, email, SĐT…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="hr-search"
        />
        <Select
          allowClear
          placeholder="Phòng ban"
          style={{ minWidth: 160 }}
          value={department}
          onChange={setDepartment}
          options={departments.map((d) => ({ value: d, label: d }))}
        />
        <Select
          allowClear
          placeholder="Loại HĐ"
          style={{ minWidth: 160 }}
          value={contract}
          onChange={setContract}
          options={contracts.map((c) => ({ value: c, label: c }))}
        />
        <Select
          allowClear
          placeholder="Tình trạng làm việc"
          style={{ minWidth: 160 }}
          value={employmentStatus}
          onChange={setEmploymentStatus}
          options={employmentStatuses.map((c) => ({ value: c, label: c }))}
        />
      </div>

      <div className="hr-table-wrap">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          // ponytail: record có field `children` (con cái) — antd Table mặc định coi là tree row → icon +
          childrenColumnName="__rowTree"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          onRow={(row) => ({
            onClick: () => onOpen(row.id),
            className: "hr-table-row",
          })}
        />
      </div>
    </main>
  );
}
