import { Checkbox } from "antd";
import type { PermissionGroup } from "../types";

interface PermissionMatrixProps {
  groups: PermissionGroup[];
  value: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
}

export function PermissionMatrix({
  groups,
  value,
  disabled,
  onChange,
}: PermissionMatrixProps) {
  return (
    <div className="admin-matrix">
      {groups.map((group) => (
        <section key={group.key} className="admin-matrix-group">
          <h4>{group.label}</h4>
          <Checkbox.Group
            disabled={disabled}
            value={value.filter((item) =>
              group.items.some((row) => row.key === item),
            )}
            options={group.items.map((item) => ({
              value: item.key,
              label: item.label,
            }))}
            onChange={(checked) => {
              const keys = group.items.map((item) => item.key);
              const rest = value.filter((item) => !keys.includes(item));
              onChange([...rest, ...(checked as string[])]);
            }}
          />
        </section>
      ))}
    </div>
  );
}
