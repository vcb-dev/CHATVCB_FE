import { useQuery } from "@tanstack/react-query";
import { Button, Drawer, Select, Spin, Table, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import { adminKeys } from "../queries/adminKeys";
import { fetchUserAccess } from "../services/adminApi";
import type { AdminUser, PermissionGroup } from "../types";

type OverrideMap = Record<string, "allow" | "deny" | "">;

interface UserAccessDrawerProps {
  user: AdminUser | null;
  groups: PermissionGroup[];
  confirmLoading: boolean;
  onClose: () => void;
  onSave: (
    items: { permission: string; effect: "allow" | "deny" }[],
  ) => Promise<void>;
}

export function UserAccessDrawer({
  user,
  groups,
  confirmLoading,
  onClose,
  onSave,
}: UserAccessDrawerProps) {
  const id = user?.id ?? "";
  const { data, isPending } = useQuery({
    queryKey: adminKeys.access(id),
    queryFn: () => fetchUserAccess(id),
    enabled: Boolean(id),
  });
  const [overrides, setOverrides] = useState<OverrideMap>({});

  useEffect(() => {
    if (!data) return;
    const next: OverrideMap = {};
    for (const row of data.overrides) {
      next[row.permission] = row.effect;
    }
    setOverrides(next);
  }, [data]);

  const rows = useMemo(() => {
    const items = groups.flatMap((group) =>
      group.items.map((item) => ({
        permission: item.key,
        label: item.label,
        group: group.label,
        fromRole: Boolean(data?.rolePermissions.includes(item.key)),
        effective: Boolean(data?.effective.includes(item.key)),
      })),
    );
    return items;
  }, [groups, data]);

  return (
    <Drawer
      title={user ? `Quyền: ${user.name}` : "Quyền"}
      open={Boolean(user)}
      onClose={onClose}
      width={760}
      extra={
        <Button
          type="primary"
          loading={confirmLoading}
          onClick={() =>
            void onSave(
              Object.entries(overrides)
                .filter(([, effect]) => effect === "allow" || effect === "deny")
                .map(([permission, effect]) => ({
                  permission,
                  effect: effect as "allow" | "deny",
                })),
            )
          }
        >
          Lưu
        </Button>
      }
    >
      <Spin spinning={isPending}>
        <p>
          Role:{" "}
          {user?.roles.map((role) => (
            <Tag key={role.id}>{role.name}</Tag>
          ))}
        </p>
        <Table
          rowKey="permission"
          size="small"
          pagination={false}
          dataSource={rows}
          columns={[
            { title: "Nhóm", dataIndex: "group", width: 140 },
            {
              title: "Quyền",
              dataIndex: "label",
              render: (text: string, row: { permission: string }) => (
                <>
                  <div>{text}</div>
                  <div style={{ fontSize: 11, color: "#8a8d91" }}>
                    {row.permission}
                  </div>
                </>
              ),
            },
            {
              title: "Từ role",
              dataIndex: "fromRole",
              width: 90,
              render: (v: boolean) => (v ? "Có" : "—"),
            },
            {
              title: "Riêng",
              width: 140,
              render: (_, row) => (
                <Select
                  size="small"
                  style={{ width: 120 }}
                  value={overrides[row.permission] || ""}
                  options={[
                    { value: "", label: "Theo role" },
                    { value: "allow", label: "Allow" },
                    { value: "deny", label: "Deny" },
                  ]}
                  onChange={(value) =>
                    setOverrides((current) => ({
                      ...current,
                      [row.permission]: value as OverrideMap[string],
                    }))
                  }
                />
              ),
            },
            {
              title: "Hiệu lực",
              dataIndex: "effective",
              width: 90,
              render: (v: boolean) =>
                v ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>,
            },
          ]}
        />
      </Spin>
    </Drawer>
  );
}
