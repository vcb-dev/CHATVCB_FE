import { P, can } from "@/lib/access";
import type { User } from "@/types";
import { Alert, Modal, Result, Spin } from "antd";
import { useMemo, useState } from "react";
import { EmployeeCreateModal } from "./components/EmployeeCreateModal";
import { EmployeeDetailView } from "./EmployeeDetailView";
import { EmployeeListView } from "./EmployeeListView";
import {
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
} from "./hooks/useEmployeeMutations";
import { useEmployeesQuery } from "./hooks/useEmployeesQuery";
import type { EmployeeProfile } from "./types";
import { ModuleLayout } from "@/components/ModuleLayout";
import { PageHeader } from "@/components/PageHeader";

interface HrPageProps {
  user: User;
}

export function HrPage({ user }: HrPageProps) {
  const canRead = can(user, P.employees.read);
  const { data: employees = [], isPending, error } = useEmployeesQuery(canRead);
  const createEmployee = useCreateEmployeeMutation();
  const updateEmployee = useUpdateEmployeeMutation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = can(user, P.employees.create);
  const canUpdate = can(user, P.employees.update);
  const canReadSensitive = can(user, P.employees.readSensitive);
  const canUpdateSensitive = can(user, P.employees.updateSensitive);
  const canExport = can(user, P.employees.read);

  const selected = useMemo(
    () => employees.find((item) => item.id === selectedId),
    [employees, selectedId],
  );

  async function handleSave(patch: Partial<EmployeeProfile> & { id: string }) {
    if (!canUpdate) return;
    await updateEmployee.mutateAsync(patch);
  }

  const header = <PageHeader title="Nhân sự" />;

  if (!canRead) {
    return (
      <ModuleLayout header={header}>
        <Result
          status="403"
          title="Không có quyền xem nhân sự"
          subTitle="Cần quyền Xem hồ sơ nhân viên"
        />
      </ModuleLayout>
    );
  }

  if (error) {
    return (
      <ModuleLayout header={header}>
        <Alert
          type="error"
          showIcon
          message="Không tải được danh sách nhân sự"
          description={
            error instanceof Error ? error.message : "Lỗi không xác định"
          }
        />
      </ModuleLayout>
    );
  }

  if (isPending && !employees.length) {
    return (
      <ModuleLayout header={header}>
        <Spin size="large" style={{ display: "block", margin: "48px auto" }} />
      </ModuleLayout>
    );
  }

  if (selected) {
    return (
      <>
        <EmployeeDetailView
          profile={selected}
          canUpdate={canUpdate}
          canReadSensitive={canReadSensitive}
          canUpdateSensitive={canUpdateSensitive}
          saveLoading={updateEmployee.isPending}
          onBack={() => setSelectedId(null)}
          onSave={handleSave}
        />
        <EmployeeCreateModal
          open={createOpen}
          confirmLoading={createEmployee.isPending}
          onClose={() => setCreateOpen(false)}
          onSubmit={async (values) => {
            const created = await createEmployee.mutateAsync(values);
            setCreateOpen(false);
            if (created.temporaryPassword) {
              Modal.info({
                title: "Mật khẩu tạm — chỉ hiện 1 lần",
                content: created.temporaryPassword,
              });
            }
          }}
        />
      </>
    );
  }

  return (
    <>
      <EmployeeListView
        employees={employees}
        canCreate={canCreate}
        canExport={canExport}
        onOpen={setSelectedId}
        onCreate={() => setCreateOpen(true)}
      />
      <EmployeeCreateModal
        open={createOpen}
        confirmLoading={createEmployee.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (values) => {
          const created = await createEmployee.mutateAsync(values);
          setCreateOpen(false);
          if (created.temporaryPassword) {
            Modal.info({
              title: "Mật khẩu tạm — chỉ hiện 1 lần",
              content: created.temporaryPassword,
            });
          }
        }}
      />
    </>
  );
}
