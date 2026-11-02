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

  async function handleSave(next: EmployeeProfile) {
    if (!canUpdate) return;
    await updateEmployee.mutateAsync(next);
  }

  if (!canRead) {
    return (
      <main className="hr-page">
        <Result
          status="403"
          title="Không có quyền xem nhân sự"
          subTitle="Cần quyền Xem hồ sơ nhân viên"
        />
      </main>
    );
  }

  if (error) {
    return (
      <main className="hr-page">
        <Alert
          type="error"
          showIcon
          message="Không tải được danh sách nhân sự"
          description={
            error instanceof Error ? error.message : "Lỗi không xác định"
          }
        />
      </main>
    );
  }

  if (isPending && !employees.length) {
    return (
      <main className="hr-page">
        <Spin size="large" style={{ display: "block", margin: "48px auto" }} />
      </main>
    );
  }

  if (selected) {
    return (
      <EmployeeDetailView
        profile={selected}
        canUpdate={canUpdate}
        canReadSensitive={canReadSensitive}
        canUpdateSensitive={canUpdateSensitive}
        saveLoading={updateEmployee.isPending}
        onBack={() => setSelectedId(null)}
        onSave={handleSave}
      />
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
