import {
  ApartmentOutlined,
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import type { CollapseProps } from "antd";
import {
  Alert,
  Button,
  Collapse,
  Input,
  Modal,
  Select,
  Spin,
  Tag,
  message,
} from "antd";
import { useMemo, useState, type Key } from "react";
import {
  DepartmentFormModal,
  type DepartmentFormValues,
} from "./components/DepartmentFormModal";
import {
  DepartmentGroupFormModal,
  type DepartmentGroupFormValues,
} from "./components/DepartmentGroupFormModal";
import { useDepartmentGroupMutations } from "./hooks/useDepartmentGroupMutations";
import { useDepartmentMutations } from "./hooks/useDepartmentMutations";
import { useDepartmentsQuery } from "./hooks/useDepartmentsQuery";
import type { OrgDepartment, OrgGroup, OrgUnitStatus } from "./types";
import { orgDepartmentMemberCount, orgStructureStats } from "./types";

type SortKey = "name-asc" | "name-desc" | "members-desc";

type DeptModalState =
  | { mode: "create" }
  | { mode: "edit"; department: OrgDepartment }
  | null;

type GroupModalState =
  | { mode: "create"; department: OrgDepartment }
  | { mode: "edit"; department: OrgDepartment; group: OrgGroup }
  | null;

function demoMembersAction() {
  message.info("Gán thành viên vào nhóm — sẽ bổ sung sau.");
}

function statusLabel(status: OrgUnitStatus) {
  return status === "active" ? "Đang hoạt động" : "Ngưng";
}

export function DepartmentsGroupsView() {
  const {
    data: departments = [],
    isPending,
    isError,
    error,
  } = useDepartmentsQuery();
  const { create, update, remove } = useDepartmentMutations();
  const {
    create: createGroup,
    update: updateGroup,
    remove: removeGroup,
  } = useDepartmentGroupMutations();

  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrgUnitStatus | "all">(
    "all",
  );
  const [sort, setSort] = useState<SortKey>("name-asc");
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [modal, setModal] = useState<DeptModalState>(null);
  const [groupModal, setGroupModal] = useState<GroupModalState>(null);

  const allGroupNames = useMemo(
    () =>
      [
        ...new Set(departments.flatMap((d) => d.groups.map((g) => g.name))),
      ].sort(),
    [departments],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = departments.filter((dept) => {
      if (statusFilter !== "all" && dept.status !== statusFilter) return false;
      if (groupFilter && !dept.groups.some((g) => g.name === groupFilter))
        return false;
      if (!q) return true;
      return (
        dept.name.toLowerCase().includes(q) ||
        dept.code.toLowerCase().includes(q) ||
        dept.groups.some((g) => g.name.toLowerCase().includes(q))
      );
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "name-desc":
          return b.name.localeCompare(a.name, "vi");
        case "members-desc":
          return orgDepartmentMemberCount(b) - orgDepartmentMemberCount(a);
        default:
          return a.name.localeCompare(b.name, "vi");
      }
    });

    return list;
  }, [departments, query, groupFilter, statusFilter, sort]);

  const stats = useMemo(() => orgStructureStats(departments), [departments]);

  function confirmDelete(dept: OrgDepartment) {
    Modal.confirm({
      title: "Xóa phòng ban?",
      content: `Bạn sắp xóa "${dept.name}" (${dept.code}). Hành động không hoàn tác.`,
      okText: "Xóa",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => remove.mutateAsync(dept.id),
    });
  }

  async function handleModalSubmit(values: DepartmentFormValues) {
    if (!modal) return;
    if (modal.mode === "create") {
      await create.mutateAsync(values);
    } else {
      await update.mutateAsync({ id: modal.department.id, payload: values });
    }
    setModal(null);
  }

  function confirmDeleteGroup(department: OrgDepartment, group: OrgGroup) {
    Modal.confirm({
      title: "Xóa nhóm?",
      content: `Bạn sắp xóa nhóm "${group.name}" trong ${department.name}.`,
      okText: "Xóa",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () =>
        removeGroup.mutateAsync({
          departmentId: department.id,
          groupId: group.id,
        }),
    });
  }

  async function handleGroupModalSubmit(values: DepartmentGroupFormValues) {
    if (!groupModal) return;
    const payload = {
      name: values.name,
      leaderName: values.leaderName || undefined,
      memberCount: values.memberCount,
      status: values.status,
    };
    if (groupModal.mode === "create") {
      await createGroup.mutateAsync({
        departmentId: groupModal.department.id,
        payload,
      });
    } else {
      await updateGroup.mutateAsync({
        departmentId: groupModal.department.id,
        groupId: groupModal.group.id,
        payload: {
          ...payload,
          leaderName: values.leaderName.trim() || null,
        },
      });
    }
    setGroupModal(null);
  }

  const collapseItems: CollapseProps["items"] = filtered.map((dept) =>
    departmentPanel(dept, {
      onAddGroup: () => setGroupModal({ mode: "create", department: dept }),
      onEdit: () => setModal({ mode: "edit", department: dept }),
      onDelete: () => confirmDelete(dept),
      onEditGroup: (group) =>
        setGroupModal({ mode: "edit", department: dept, group }),
      onDeleteGroup: (group) => confirmDeleteGroup(dept, group),
    }),
  );

  const modalLoading = create.isPending || update.isPending;
  const groupModalLoading = createGroup.isPending || updateGroup.isPending;

  return (
    <main className="dept-page">
      {isError ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="Không tải được danh sách phòng ban"
          description={
            error instanceof Error ? error.message : "Lỗi không xác định"
          }
        />
      ) : null}

      <div className="dept-hero">
        <section className="dept-hero-main">
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
          style={{ minWidth: 280 }}
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
            { value: "all", label: "Mọi trạng thái" },
            { value: "active", label: "Đang hoạt động" },
            { value: "inactive", label: "Ngưng" },
          ]}
        />
        <Select
          style={{ minWidth: 140 }}
          value={sort}
          onChange={setSort}
          options={[
            { value: "name-asc", label: "Tên A → Z" },
            { value: "name-desc", label: "Tên Z → A" },
            { value: "members-desc", label: "Nhiều thành viên" },
          ]}
        />
        <div className="dept-toolbar-actions">
          <Button
            type="primary"
            className="dept-primary"
            icon={<PlusOutlined />}
            onClick={() => setModal({ mode: "create" })}
          >
            Phòng ban
          </Button>
        </div>
      </div>

      <Spin spinning={isPending}>
        <div className="dept-tree">
          {!isPending && filtered.length === 0 ? (
            <div className="dept-empty">
              {departments.length === 0
                ? "Chưa có phòng ban. Bấm «Phòng ban» để thêm."
                : "Không có phòng ban phù hợp bộ lọc."}
            </div>
          ) : (
            <Collapse
              bordered={false}
              activeKey={expandedKeys}
              onChange={(keys: Key | Key[]) => {
                const next = Array.isArray(keys)
                  ? keys
                  : keys != null
                    ? [keys]
                    : [];
                setExpandedKeys(next.map(String));
              }}
              items={collapseItems}
            />
          )}
        </div>
      </Spin>

      <DepartmentFormModal
        open={modal !== null}
        mode={modal?.mode === "edit" ? "edit" : "create"}
        initial={modal?.mode === "edit" ? modal.department : null}
        confirmLoading={modalLoading}
        onClose={() => setModal(null)}
        onSubmit={handleModalSubmit}
      />

      <DepartmentGroupFormModal
        open={groupModal !== null}
        mode={groupModal?.mode === "edit" ? "edit" : "create"}
        departmentName={groupModal?.department.name ?? ""}
        initial={groupModal?.mode === "edit" ? groupModal.group : null}
        confirmLoading={groupModalLoading}
        onClose={() => setGroupModal(null)}
        onSubmit={handleGroupModalSubmit}
      />
    </main>
  );
}

function departmentPanel(
  dept: OrgDepartment,
  actions: {
    onAddGroup: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onEditGroup: (group: OrgGroup) => void;
    onDeleteGroup: (group: OrgGroup) => void;
  },
) {
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
              {dept.status === "inactive" ? (
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
            onClick={actions.onAddGroup}
          >
            Nhóm
          </Button>
          <Button
            size="small"
            type="text"
            aria-label="Sửa phòng ban"
            icon={<EditOutlined />}
            onClick={actions.onEdit}
          />
          <Button
            size="small"
            type="text"
            danger
            aria-label="Xóa phòng ban"
            icon={<DeleteOutlined />}
            onClick={actions.onDelete}
          />
        </div>
      </div>
    ),
    children:
      dept.groups.length === 0 ? (
        <div
          className="dept-group-wrap dept-empty"
          style={{ padding: "12px 36px" }}
        >
          Chưa có nhóm trong phòng ban này.
        </div>
      ) : (
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
                    {group.status === "inactive" ? (
                      <Tag color="default" style={{ marginInlineStart: 8 }}>
                        Ngưng
                      </Tag>
                    ) : null}
                  </td>
                  <td>{group.leaderName?.trim() || "—"}</td>
                  <td>
                    <span className="dept-member-badge">
                      {group.memberCount}
                    </span>
                  </td>
                  <td>
                    <div className="dept-row-actions">
                      <Button
                        type="link"
                        size="small"
                        className="dept-link"
                        onClick={demoMembersAction}
                      >
                        + Thành viên
                      </Button>
                      <Button
                        type="text"
                        size="small"
                        aria-label="Sửa nhóm"
                        icon={<EditOutlined />}
                        onClick={() => actions.onEditGroup(group)}
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        aria-label="Xóa nhóm"
                        icon={<DeleteOutlined />}
                        onClick={() => actions.onDeleteGroup(group)}
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
