import { fileSrc } from "@/api/client";
import { avatarColor, initials } from "@/lib/avatar";
import { ExportOutlined, UserAddOutlined } from "@ant-design/icons";
import {
  Avatar,
  Button,
  Input,
  message,
  Select,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import type { EmployeeProfile } from "./types";
import { ModuleLayout } from "@/components/ModuleLayout";
import { PageHeader } from "@/components/PageHeader";
import { ContentCard } from "@/components/ContentCard";

interface Props {
  employees: EmployeeProfile[];
  canCreate?: boolean;
  onOpen: (id: string) => void;
  onCreate?: () => void;
  canExport?: boolean;
}

export function EmployeeListView({
  employees,
  canCreate,
  onOpen,
  onCreate,
  canExport,
}: Props) {
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
      official: employees.filter((e) => e.contractType.includes("Chính thức")).length,
      probation: employees.filter((e) => e.contractType.includes("Thử việc")).length,
      resigned: employees.filter((e) => e.employmentStatus === "Nghỉ việc").length,
    }),
    [employees],
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
            src={row.avatarUrl ? fileSrc(row.avatarUrl) : undefined}
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

  const pageHeader = (
    <PageHeader
      title="Nhân sự"
      meta={
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Tag color="default">Tổng: {stats.total}</Tag>
          <Tag color="blue">Chính thức: {stats.official}</Tag>
          <Tag color="orange">Thử việc: {stats.probation}</Tag>
          <Tag color="red">Nghỉ việc: {stats.resigned}</Tag>
        </div>
      }
      actions={
        <>
          <Button
            disabled={!canExport}
            icon={<ExportOutlined />}
            onClick={() => message.info("Export sẽ kết nối API sau.")}
          >
            Xuất file
          </Button>
          {canCreate && onCreate ? (
            <Button type="primary" icon={<UserAddOutlined />} onClick={onCreate}>
              Thêm nhân viên
            </Button>
          ) : null}
        </>
      }
    >
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", width: "100%" }}>
        <Input.Search
          allowClear
          placeholder="Tìm mã NV, họ tên, email, SĐT…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: 260 }}
        />
        <Select
          allowClear
          placeholder="Phòng ban"
          style={{ minWidth: 150 }}
          value={department}
          onChange={setDepartment}
          options={departments.map((d) => ({ value: d, label: d }))}
        />
        <Select
          allowClear
          placeholder="Loại HĐ"
          style={{ minWidth: 140 }}
          value={contract}
          onChange={setContract}
          options={contracts.map((c) => ({ value: c, label: c }))}
        />
        <Select
          allowClear
          placeholder="Trạng thái"
          style={{ minWidth: 150 }}
          value={employmentStatus}
          onChange={setEmploymentStatus}
          options={employmentStatuses.map((c) => ({ value: c, label: c }))}
        />
      </div>
    </PageHeader>
  );

  return (
    <ModuleLayout header={pageHeader}>
      <ContentCard>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          childrenColumnName="__rowTree"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          onRow={(row) => ({
            onClick: () => onOpen(row.id),
            className: "hr-table-row",
          })}
        />
      </ContentCard>
    </ModuleLayout>
  );
}
