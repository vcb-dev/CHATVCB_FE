import {
  ApartmentOutlined,
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { Button, Collapse, Input, Select, Tag, Typography, message } from 'antd';
import type { CollapseProps } from 'antd';
import { useMemo, useState } from 'react';
import { MOCK_ORG_DEPARTMENTS } from './mockDepartments';
import type { OrgDepartment, OrgUnitStatus } from './types';
import { orgDepartmentMemberCount, orgStructureStats } from './types';

type SortKey = 'name-asc' | 'name-desc' | 'members-desc';

function demoAction(label: string) {
  message.info(`${label} — sẽ kết nối API sau.`);
}

function statusLabel(status: OrgUnitStatus) {
  return status === 'active' ? 'Đang hoạt động' : 'Ngưng';
}

export function DepartmentsGroupsView() {
  const [departments] = useState(MOCK_ORG_DEPARTMENTS);
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrgUnitStatus | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('name-asc');
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['dept-hckt']);

  const allGroupNames = useMemo(
    () => [...new Set(departments.flatMap((d) => d.groups.map((g) => g.name)))].sort(),
    [departments],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = departments.filter((dept) => {
      if (statusFilter !== 'all' && dept.status !== statusFilter) return false;
      if (groupFilter && !dept.groups.some((g) => g.name === groupFilter)) return false;
      if (!q) return true;
      return (
        dept.name.toLowerCase().includes(q) ||
        dept.code.toLowerCase().includes(q) ||
        dept.groups.some((g) => g.name.toLowerCase().includes(q))
      );
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'name-desc':
          return b.name.localeCompare(a.name, 'vi');
        case 'members-desc':
          return orgDepartmentMemberCount(b) - orgDepartmentMemberCount(a);
        default:
          return a.name.localeCompare(b.name, 'vi');
      }
    });

    return list;
  }, [departments, query, groupFilter, statusFilter, sort]);

  const stats = useMemo(() => orgStructureStats(departments), [departments]);

  const collapseItems: CollapseProps['items'] = filtered.map((dept) =>
    departmentPanel(dept, () => demoAction('Thêm nhóm')),
  );

  return (
    <main className="dept-page">
      <div className="dept-hero">
        <section className="dept-hero-main">
          <Typography.Text className="dept-eyebrow">Tổ chức</Typography.Text>
          <h1>Phòng ban &amp; nhóm</h1>
          <p>Quản lý cấu trúc tổ chức và thành viên nội bộ.</p>
        </section>
        <div className="dept-mini-stats">
          <div className="dept-mini-stat purple">
            <ApartmentOutlined aria-hidden />
            <div>
              <strong>{stats.departmentCount}</strong>
              <span>Phòng ban</span>
            </div>
          </div>
          <div className="dept-mini-stat green">
            <UsergroupAddOutlined aria-hidden />
            <div>
              <strong>{stats.groupCount}</strong>
              <span>Nhóm</span>
            </div>
          </div>
          <div className="dept-mini-stat blue">
            <TeamOutlined aria-hidden />
            <div>
              <strong>{stats.memberCount}</strong>
              <span>Thành viên</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dept-toolbar">
        <Input.Search
          allowClear
          placeholder="Tìm theo tên / mã phòng ban / nhóm…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="dept-search"
        />
        <Select
          allowClear
          placeholder="Tất cả nhóm"
          style={{ minWidth: 180 }}
          value={groupFilter}
          onChange={setGroupFilter}
          options={allGroupNames.map((name) => ({ value: name, label: name }))}
        />
        <Select
          placeholder="Mọi trạng thái"
          style={{ minWidth: 160 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'Mọi trạng thái' },
            { value: 'active', label: 'Đang hoạt động' },
            { value: 'inactive', label: 'Ngưng' },
          ]}
        />
        <Select
          style={{ minWidth: 140 }}
          value={sort}
          onChange={setSort}
          options={[
            { value: 'name-asc', label: 'Tên A → Z' },
            { value: 'name-desc', label: 'Tên Z → A' },
            { value: 'members-desc', label: 'Nhiều thành viên' },
          ]}
        />
        <div className="dept-toolbar-actions">
          <Button
            type="primary"
            className="dept-primary"
            icon={<PlusOutlined />}
            onClick={() => demoAction('Thêm phòng ban')}
          >
            Phòng ban
          </Button>
          <Button onClick={() => setExpandedKeys(filtered.map((d) => d.id))}>Mở tất cả</Button>
          <Button onClick={() => setExpandedKeys([])}>Thu gọn</Button>
        </div>
      </div>

      <p className="dept-count">
        {filtered.length}/{departments.length} phòng ban
      </p>

      <div className="dept-tree">
        {filtered.length === 0 ? (
          <div className="dept-empty">Không có phòng ban phù hợp bộ lọc.</div>
        ) : (
          <Collapse
            bordered={false}
            activeKey={expandedKeys}
            onChange={(keys) =>
              setExpandedKeys(Array.isArray(keys) ? keys : [keys].filter(Boolean))
            }
            items={collapseItems}
          />
        )}
      </div>
    </main>
  );
}

function departmentPanel(dept: OrgDepartment, onAddGroup: () => void) {
  const members = orgDepartmentMemberCount(dept);
  const groupCount = dept.groups.length;

  return {
    key: dept.id,
    label: (
      <div className="dept-dept-head">
        <div className="dept-dept-title">
          <BankOutlined className="dept-dept-icon" aria-hidden />
          <div>
            <div className="dept-dept-name-row">
              <strong>{dept.name}</strong>
              <Tag className="dept-code-tag">{dept.code}</Tag>
              {dept.status === 'inactive' ? (
                <Tag color="default">{statusLabel(dept.status)}</Tag>
              ) : null}
            </div>
            <span className="dept-dept-meta">
              {groupCount} nhóm · {members} thành viên
            </span>
          </div>
        </div>
        <div
          className="dept-dept-actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <Button
            size="small"
            type="link"
            className="dept-link"
            icon={<PlusOutlined />}
            onClick={onAddGroup}
          >
            Nhóm
          </Button>
          <Button
            size="small"
            type="text"
            aria-label="Sửa phòng ban"
            icon={<EditOutlined />}
            onClick={() => demoAction('Sửa phòng ban')}
          />
          <Button
            size="small"
            type="text"
            danger
            aria-label="Xóa phòng ban"
            icon={<DeleteOutlined />}
            onClick={() => demoAction('Xóa phòng ban')}
          />
        </div>
      </div>
    ),
    children: (
      <div className="dept-group-wrap">
        <table className="dept-group-table">
          <thead>
            <tr>
              <th>Tên nhóm</th>
              <th>Trưởng nhóm</th>
              <th>Thành viên</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {dept.groups.map((group) => (
              <tr key={group.id}>
                <td>
                  <span className="dept-group-name">{group.name}</span>
                  {group.status === 'inactive' ? (
                    <Tag color="default" style={{ marginInlineStart: 8 }}>
                      Ngưng
                    </Tag>
                  ) : null}
                </td>
                <td>{group.leaderName?.trim() || '—'}</td>
                <td>
                  <span className="dept-member-badge">{group.memberCount}</span>
                </td>
                <td>
                  <div className="dept-row-actions">
                    <Button
                      type="link"
                      size="small"
                      className="dept-link"
                      onClick={() => demoAction('Thêm thành viên vào nhóm')}
                    >
                      + Thành viên
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      aria-label="Sửa nhóm"
                      icon={<EditOutlined />}
                      onClick={() => demoAction('Sửa nhóm')}
                    />
                    <Button
                      type="text"
                      size="small"
                      danger
                      aria-label="Xóa nhóm"
                      icon={<DeleteOutlined />}
                      onClick={() => demoAction('Xóa nhóm')}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  };
}
