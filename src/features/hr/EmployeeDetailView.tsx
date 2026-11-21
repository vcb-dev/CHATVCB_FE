import { useAdminUsersQuery } from "@/features/admin/hooks/useAdminQueries";
import { useDepartmentsQuery } from "@/features/departments/hooks/useDepartmentsQuery";
import type { OrgDepartment } from "@/features/departments/types";
import {
  departmentSelectOptions,
  groupSelectOptionsForDepartment,
} from "@/features/departments/utils/departmentSelect";
import { UserAvatar } from "@/components/UserAvatar";
import { CONSTANTS_ROLE } from "@/lib/common";
import {
  ArrowLeftOutlined,
  BankOutlined,
  CameraOutlined,
  CloudUploadOutlined,
  LoadingOutlined,
  PictureOutlined,
  EditOutlined,
  IdcardOutlined,
  ReadOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Button,
  Image,
  Form,
  Input,
  Select,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ChangeEvent } from "react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { FormField } from "@/components/FormField";
import { employeeKeys } from "./queries/employeeKeys";
import { uploadCitizenId } from "./services/employeesApi";
import {
  HrField,
  HrFieldGrid,
  HrPersonRow,
  HrSectionCard,
  HrSensitiveBanner,
  HrSubBlock,
} from "./components/HrUi";
import type { EmployeeProfile } from "./types";
import { ModuleLayout } from "@/components/ModuleLayout";
import { PageHeader } from "@/components/PageHeader";

interface Props {
  profile: EmployeeProfile;
  canUpdate?: boolean;
  canReadSensitive?: boolean;
  canUpdateSensitive?: boolean;
  saveLoading?: boolean;
  onBack: () => void;
  onSave: (
    patch: Partial<EmployeeProfile> & { id: string },
  ) => void | Promise<void>;
}

const TAB_KEYS = [
  "work",
  "personal",
  "education",
  "identity",
  "family",
  "other",
] as const;

type TabKey = (typeof TAB_KEYS)[number];

const TAB_FIELDS: Record<TabKey, (keyof EmployeeProfile)[]> = {
  work: [
    "startDate",
    "employeeCode",
    "contractType",
    "jobTitle",
    "specialtyPosition",
    "department",
    "departmentGroup",
    "managementBlockCode",
    "directManagerName",
    "employmentStatus",
  ],
  personal: [
    "fullName",
    "gender",
    "dateOfBirth",
    "phone",
    "email",
    "maritalStatus",
    "ethnicity",
    "religion",
    "address",
    "permanentAddress",
  ],
  education: ["educationLevel", "schoolName"],
  identity: [
    "citizenIdNumber",
    "citizenIdIssuedPlace",
    "socialInsuranceNumber",
  ],
  family: ["emergencyContact", "guardianFather", "guardianMother"],
  other: ["bankAccount", "vehicles"],
};

const SENSITIVE_TABS: TabKey[] = ["identity", "other"];

const SAVE_VALIDATE_NAMES: (keyof EmployeeProfile)[] = [
  "employeeCode",
  "fullName",
];

const SAVE_VALIDATE_LABELS: Partial<Record<keyof EmployeeProfile, string>> = {
  employeeCode: "Mã nhân viên",
  fullName: "Họ và tên",
};

function stripSensitivePatch(
  patch: Partial<EmployeeProfile>,
): Partial<EmployeeProfile> {
  const next = { ...patch };
  for (const tab of SENSITIVE_TABS) {
    for (const key of TAB_FIELDS[tab]) {
      delete next[key];
    }
  }
  delete next.bankAccount;
  return next;
}

export function EmployeeDetailView({
  profile,
  canUpdate = false,
  canReadSensitive = false,
  canUpdateSensitive = false,
  saveLoading = false,
  onBack,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const form = useForm<EmployeeProfile>({ mode: "onChange" });
  const { reset, trigger, getValues, getFieldState, setFocus } = form;
  const [activeTab, setActiveTab] = useState<TabKey>("work");

  useEffect(() => {
    setDraft(profile);
    reset(profile);
    setEditing(false);
  }, [profile, reset]);

  function cancelEdit() {
    setDraft(profile);
    reset(profile);
    setEditing(false);
  }

  /** Lưu theo từng tab: chỉ kiểm ô bắt buộc và chỉ gửi trường của tab đang mở. */
  async function saveEdit() {
    const tabFields = TAB_FIELDS[activeTab];
    const names = SAVE_VALIDATE_NAMES.filter((name) => tabFields.includes(name));
    if (!(await trigger(names))) {
      const name = names.find((key) => getFieldState(key).invalid);
      if (name) {
        setFocus(name);
        document.activeElement?.scrollIntoView({ block: "center" });
      }
      const label = name ? SAVE_VALIDATE_LABELS[name] : undefined;
      message.warning(
        label ? `Chưa điền ${label}.` : "Kiểm tra lại các trường bắt buộc.",
      );
      return;
    }
    const values = getValues();
    let patch = Object.fromEntries(
      tabFields.map((key) => [key, values[key]]),
    ) as Partial<EmployeeProfile>;
    if (!canUpdateSensitive) {
      patch = stripSensitivePatch(patch);
    }
    try {
      await onSave({ id: profile.id, ...patch });
    } catch {
      // useUpdateEmployeeMutation đã hiện lỗi của server; giữ nguyên chế độ sửa.
      return;
    }
    const merged = { ...profile, ...patch } as EmployeeProfile;
    setDraft(merged);
    reset(merged);
    setEditing(false);
  }

  const data = editing ? draft : profile;
  const { data: orgDepartments = [] } = useDepartmentsQuery();

  const detailHeader = (
    <PageHeader
      icon={
        <UserAvatar
          size={36}
          src={data.avatarUrl}
          name={data.fullName}
          style={{ color: "#fff", fontWeight: 700 }}
        />
      }
      title={data.fullName}
      onBack={onBack}
      meta={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "var(--ui-text-2)", fontSize: 13 }}>
            {data.employeeCode} · {data.department} · {data.jobTitle}
          </span>
          <Tag color="blue">{data.contractType}</Tag>
          <Tag color={data.employmentStatus === "Nghỉ việc" ? "red" : "green"}>
            {data.employmentStatus}
          </Tag>
        </div>
      }
      actions={
        editing ? (
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={cancelEdit}>Hủy</Button>
            <Button
              type="primary"
              loading={saveLoading}
              onClick={() => void saveEdit()}
            >
              Lưu thay đổi
            </Button>
          </div>
        ) : canUpdate ? (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => setEditing(true)}
          >
            Chỉnh sửa
          </Button>
        ) : null
      }
    />
  );

  return (
    <ModuleLayout header={detailHeader}>
      <FormProvider {...form}>
        <Form
          layout="vertical"
          className="hr-detail-form"
          disabled={!editing}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
            className="hr-detail-tabs"
            items={TAB_KEYS.map((key) => ({
              key,
              label: tabLabel(key),
              // Lưu theo từng tab: đang sửa thì khoá tab khác để thay đổi chưa lưu không bị mất.
              disabled: editing && key !== activeTab,
            }))}
          />
          <div className="hr-detail-tab-scroll">
            {editing ? (
              TAB_KEYS.map((key) => (
                <div
                  key={key}
                  className="hr-tab-panel"
                  hidden={activeTab !== key}
                >
                  {tabContent(key, data, editing, form, orgDepartments, {
                    canReadSensitive,
                    canUpdateSensitive,
                  })}
                </div>
              ))
            ) : (
              <div className="hr-tab-panel">
                {tabContent(activeTab, data, editing, form, orgDepartments, {
                  canReadSensitive,
                  canUpdateSensitive,
                })}
              </div>
            )}
          </div>
        </Form>
      </FormProvider>
    </ModuleLayout>
  );
}

function tabLabel(key: TabKey) {
  switch (key) {
    case "work":
      return "Công việc";
    case "personal":
      return "Cá nhân";
    case "education":
      return "Học vấn";
    case "identity":
      return "Giấy tờ";
    case "family":
      return "Gia đình";
    default:
      return "Khác";
  }
}

function tabContent(
  key: TabKey,
  data: EmployeeProfile,
  editing: boolean,
  _form: UseFormReturn<EmployeeProfile>,
  orgDepartments: OrgDepartment[],
  access: { canReadSensitive: boolean; canUpdateSensitive: boolean },
) {
  switch (key) {
    case "work":
      return (
        <WorkTab
          data={data}
          editing={editing}
          orgDepartments={orgDepartments}
        />
      );
    case "personal":
      return <PersonalTab data={data} editing={editing} />;
    case "education":
      return <EducationTab data={data} editing={editing} />;
    case "identity":
      return (
        <IdentityTab
          data={data}
          editing={editing}
          canReadSensitive={access.canReadSensitive}
          canUpdateSensitive={access.canUpdateSensitive}
        />
      );
    case "family":
      return <FamilyTab data={data} editing={editing} />;
    default:
      return (
        <OtherTab
          data={data}
          editing={editing}
          canReadSensitive={access.canReadSensitive}
          canUpdateSensitive={access.canUpdateSensitive}
        />
      );
  }
}

function WorkTab({
  data,
  editing,
  orgDepartments,
}: {
  data: EmployeeProfile;
  editing: boolean;
  orgDepartments: OrgDepartment[];
}) {
  const { control, setValue } = useFormContext<EmployeeProfile>();
  const departmentWatch = useWatch({ control, name: "department" });
  const { data: adminUsers = [] } = useAdminUsersQuery();
  const leaderOptions = adminUsers
    .filter((u) =>
      u.roles.some((r) =>
        r.name.toLowerCase().includes(CONSTANTS_ROLE.LEADER.toLowerCase()),
      ),
    )
    .map((u) => ({ value: u.name, label: u.name }));
  if (
    data.managementBlockCode &&
    !leaderOptions.some((o) => o.value === data.managementBlockCode)
  ) {
    leaderOptions.push({
      value: data.managementBlockCode,
      label: data.managementBlockCode,
    });
  }
  const managerRoles: string[] = [
    CONSTANTS_ROLE.MANAGER,
    CONSTANTS_ROLE.BOD,
  ];
  const managerOptions = adminUsers
    .filter((u) => u.roles.some((r) => managerRoles.includes(r.name)))
    .map((u) => ({ value: u.name, label: u.name }));
  if (
    data.directManagerName &&
    !managerOptions.some((o) => o.value === data.directManagerName)
  ) {
    managerOptions.push({
      value: data.directManagerName,
      label: data.directManagerName,
    });
  }
  const departmentGroupOptions = groupSelectOptionsForDepartment(
    orgDepartments,
    departmentWatch ?? data.department,
  );

  return (
    <HrSectionCard
      icon={<SolutionOutlined />}
      title="Công việc & tổ chức"
      subtitle="Thông tin nội bộ và cấu trúc phòng ban"
    >
      {!editing ? (
        <>
          <HrPersonRow
            label="Quản lý trực tiếp"
            name={data.directManagerName}
          />
          <HrFieldGrid>
            <HrField label="Ngày bắt đầu làm việc" value={data.startDate} />
            <HrField label="Mã nhân viên" value={data.employeeCode} highlight />
            <HrField label="Loại hợp đồng" value={data.contractType} />
            <HrField label="Vị trí (HĐ)" value={data.jobTitle} />
            <HrField label="Vị trí chuyên môn" value={data.specialtyPosition} />
            <HrField label="Phòng ban" value={data.department} />
            <HrField
              label="Nhóm (theo phòng ban)"
              value={data.departmentGroup}
            />
            <HrField label="Trưởng nhóm" value={data.managementBlockCode} />
            <HrField
              label="Tình trạng làm việc"
              value={data.employmentStatus}
            />
          </HrFieldGrid>
        </>
      ) : (
        <HrFieldGrid>
          <FormField
            name="startDate"
            label="Ngày bắt đầu làm việc"
            className="hr-form-item"
          >
            <Input />
          </FormField>
          <FormField
            name="employeeCode"
            label="Mã nhân viên"
            rules={{ required: "Nhập mã nhân viên" }}
          >
            <Input />
          </FormField>
          <FormField name="contractType" label="Loại hợp đồng">
            <Select
              options={[
                { value: "Chính thức", label: "Chính thức" },
                { value: "Thử việc", label: "Thử việc" },
                {
                  value: "Không xác định thời hạn",
                  label: "Không xác định thời hạn",
                },
              ]}
            />
          </FormField>
          <FormField name="jobTitle" label="Vị trí (HĐ)">
            <Select
              allowClear
              options={[
                { value: "Fulltime", label: "Fulltime" },
                { value: "Parttime", label: "Parttime" },
              ]}
            />
          </FormField>
          <FormField name="specialtyPosition" label="Vị trí chuyên môn">
            <Input />
          </FormField>
          <FormField name="department" label="Phòng ban">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={departmentSelectOptions(orgDepartments)}
              onChange={() => setValue("departmentGroup", "")}
            />
          </FormField>
          <FormField name="departmentGroup" label="Nhóm (theo phòng ban)">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={!departmentWatch && !data.department}
              options={departmentGroupOptions}
              placeholder={
                departmentWatch || data.department
                  ? "Chọn nhóm"
                  : "Chọn phòng ban trước"
              }
            />
          </FormField>
          <FormField name="managementBlockCode" label="Trưởng nhóm">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={leaderOptions}
              placeholder="Chọn trưởng nhóm"
            />
          </FormField>
          <FormField name="directManagerName" label="Quản lý trực tiếp">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={managerOptions}
              placeholder="Chọn quản lý trực tiếp"
            />
          </FormField>
          <FormField name="employmentStatus" label="Tình trạng làm việc">
            <Select
              options={[
                { value: "Đang làm việc", label: "Đang làm việc" },
                { value: "Thử việc", label: "Thử việc" },
                { value: "Nghỉ phép dài hạn", label: "Nghỉ phép dài hạn" },
                { value: "Đã nghỉ việc", label: "Đã nghỉ việc" },
              ]}
            />
          </FormField>
        </HrFieldGrid>
      )}
    </HrSectionCard>
  );
}

function PersonalTab({
  data,
  editing,
}: {
  data: EmployeeProfile;
  editing: boolean;
}) {
  if (editing) {
    return (
      <HrSectionCard
        icon={<UserOutlined />}
        title="Thông tin cá nhân"
        subtitle="Liên hệ và thông tin cơ bản"
      >
        <HrFieldGrid>
          <FormField
            name="fullName"
            label="Họ và tên"
            rules={{ required: "Nhập họ và tên" }}
          >
            <Input />
          </FormField>
          <FormField name="gender" label="Giới tính">
            <Select
              options={[{ value: "Nam" }, { value: "Nữ" }, { value: "Khác" }]}
            />
          </FormField>
          <FormField name="dateOfBirth" label="Ngày sinh">
            <Input placeholder="dd/mm/yyyy" />
          </FormField>
          <FormField name="phone" label="Số điện thoại">
            <Input />
          </FormField>
          <FormField name="email" label="Email">
            <Input type="email" />
          </FormField>
          <FormField name="maritalStatus" label="Tình trạng hôn nhân">
            <Select
              allowClear
              options={[
                { value: "Đã kết hôn", label: "Đã kết hôn" },
                { value: "Chưa kết hôn", label: "Chưa kết hôn" },
              ]}
            />
          </FormField>
          <FormField name="ethnicity" label="Dân tộc">
            <Input />
          </FormField>
          <FormField name="religion" label="Tôn giáo">
            <Input />
          </FormField>
          <FormField name="address" label="Địa chỉ hiện tại" className="wide">
            <Input.TextArea rows={2} />
          </FormField>
          <FormField
            name="permanentAddress"
            label="Hộ khẩu thường trú"
            className="wide"
          >
            <Input.TextArea rows={2} />
          </FormField>
        </HrFieldGrid>
      </HrSectionCard>
    );
  }

  return (
    <HrSectionCard
      icon={<UserOutlined />}
      title="Thông tin cá nhân"
      subtitle="Liên hệ và thông tin cơ bản"
    >
      <HrFieldGrid>
        <HrField label="Họ và tên" value={data.fullName} highlight />
        <HrField label="Giới tính" value={data.gender} />
        <HrField label="Ngày sinh" value={data.dateOfBirth} />
        <HrField label="Số điện thoại" value={data.phone} />
        <HrField label="Email" value={data.email} />
        <HrField label="Tình trạng hôn nhân" value={data.maritalStatus} />
        <HrField label="Dân tộc" value={data.ethnicity} />
        <HrField label="Tôn giáo" value={data.religion} />
        <HrField label="Địa chỉ hiện tại" value={data.address} wide />
        <HrField
          label="Hộ khẩu thường trú"
          value={data.permanentAddress}
          wide
        />
      </HrFieldGrid>
    </HrSectionCard>
  );
}

function EducationTab({
  data,
  editing,
}: {
  data: EmployeeProfile;
  editing: boolean;
}) {
  return (
    <HrSectionCard
      icon={<ReadOutlined />}
      title="Học vấn"
      subtitle="Trình độ và đơn vị đào tạo"
    >
      {editing ? (
        <HrFieldGrid>
          <FormField name="educationLevel" label="Trình độ học vấn">
            <Input />
          </FormField>
          <FormField name="schoolName" label="Trường / cơ sở đào tạo">
            <Input />
          </FormField>
        </HrFieldGrid>
      ) : (
        <HrFieldGrid>
          <HrField label="Trình độ học vấn" value={data.educationLevel} />
          <HrField label="Trường / cơ sở đào tạo" value={data.schoolName} />
        </HrFieldGrid>
      )}
    </HrSectionCard>
  );
}

function IdentityTab({
  data,
  editing,
  canReadSensitive,
  canUpdateSensitive,
}: {
  data: EmployeeProfile;
  editing: boolean;
  canReadSensitive: boolean;
  canUpdateSensitive: boolean;
}) {
  if (!canReadSensitive) {
    return (
      <Typography.Text type="secondary">
        Cần quyền «Xem thông tin nhạy cảm» để xem giấy tờ và BHXH.
      </Typography.Text>
    );
  }
  const canEdit = editing && canUpdateSensitive;
  return (
    <>
      <HrSensitiveBanner />
      <HrSectionCard
        icon={<IdcardOutlined />}
        title="Giấy tờ & bảo hiểm"
        subtitle="CCCD và số sổ BHXH"
      >
        {canEdit ? (
          <HrFieldGrid>
            <FormField name="citizenIdNumber" label="Số CCCD">
              <Input />
            </FormField>
            <FormField name="citizenIdIssuedPlace" label="Nơi cấp">
              <Input />
            </FormField>
            <FormField name="socialInsuranceNumber" label="Số sổ bảo hiểm">
              <Input />
            </FormField>
          </HrFieldGrid>
        ) : (
          <HrFieldGrid>
            <HrField label="Số CCCD" value={data.citizenIdNumber} />
            <HrField label="Nơi cấp" value={data.citizenIdIssuedPlace} />
            <HrField
              label="Số sổ bảo hiểm"
              value={data.socialInsuranceNumber}
            />
          </HrFieldGrid>
        )}
        <div className="hr-doc-row">
          <CitizenIdSlot
            label="Mặt trước CCCD"
            userId={data.id}
            side="front"
            url={data.citizenIdFrontUrl}
            canUpload={canUpdateSensitive && !editing}
          />
          <CitizenIdSlot
            label="Mặt sau CCCD"
            userId={data.id}
            side="back"
            url={data.citizenIdBackUrl}
            canUpload={canUpdateSensitive && !editing}
          />
        </div>
      </HrSectionCard>
    </>
  );
}

function CitizenIdSlot({
  label,
  userId,
  side,
  url,
  canUpload,
}: {
  label: string;
  userId: string;
  side: "front" | "back";
  url?: string;
  canUpload: boolean;
}) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      message.warning("Chỉ chấp nhận file ảnh.");
      return;
    }
    setUploading(true);
    try {
      await uploadCitizenId(userId, side, file);
      await queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      message.success("Đã tải ảnh lên.");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Tải ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  }

  const input = (
    <input
      type="file"
      accept="image/*"
      hidden
      disabled={uploading}
      onChange={onPick}
    />
  );

  return (
    <div className="hr-doc-slot">
      <span className="hr-field-label">{label}</span>
      {url ? (
        <div className="hr-doc-card">
          <Image src={url} alt={label} className="hr-doc-img" />
          {canUpload ? (
            <label className="hr-doc-replace">
              {input}
              <CameraOutlined /> {uploading ? "Đang tải..." : "Đổi ảnh"}
            </label>
          ) : null}
        </div>
      ) : canUpload ? (
        <label className="hr-doc-frame hr-doc-drop">
          {input}
          {uploading ? (
            <LoadingOutlined />
          ) : (
            <>
              <CloudUploadOutlined className="hr-doc-drop-icon" />
              <strong>Tải ảnh lên</strong>
              <span>JPG, PNG · tối đa 8MB</span>
            </>
          )}
        </label>
      ) : (
        <div className="hr-doc-frame">
          <PictureOutlined className="hr-doc-drop-icon" />
          <span>Chưa tải ảnh</span>
        </div>
      )}
    </div>
  );
}

function FamilyTab({
  data,
  editing,
}: {
  data: EmployeeProfile;
  editing: boolean;
}) {
  return (
    <HrSectionCard
      icon={<TeamOutlined />}
      title="Gia đình & liên hệ"
      subtitle="Liên hệ khẩn cấp và người giám hộ"
    >
      <HrSubBlock title="Liên hệ khẩn cấp">
        {editing ? (
          <HrFieldGrid>
            <FormField name="emergencyContact.name" label="Họ tên">
              <Input />
            </FormField>
            <FormField
              name="emergencyContact.relationship"
              label="Quan hệ"
            >
              <Input />
            </FormField>
            <FormField
              name="emergencyContact.phone"
              label="Số điện thoại"
            >
              <Input />
            </FormField>
          </HrFieldGrid>
        ) : (
          <HrFieldGrid>
            <HrField label="Họ tên" value={data.emergencyContact.name} />
            <HrField
              label="Quan hệ"
              value={data.emergencyContact.relationship}
            />
            <HrField
              label="Số điện thoại"
              value={data.emergencyContact.phone}
            />
          </HrFieldGrid>
        )}
      </HrSubBlock>
      <HrSubBlock title="Người giám hộ">
        {editing ? (
          <HrFieldGrid>
            <FormField name="guardianFather.name" label="Cha — họ tên">
              <Input />
            </FormField>
            <FormField name="guardianFather.phone" label="Cha — SĐT">
              <Input />
            </FormField>
            <FormField name="guardianMother.name" label="Mẹ — họ tên">
              <Input />
            </FormField>
            <FormField name="guardianMother.phone" label="Mẹ — SĐT">
              <Input />
            </FormField>
          </HrFieldGrid>
        ) : (
          <HrFieldGrid>
            <HrField
              label="Cha"
              value={`${data.guardianFather.name} · ${data.guardianFather.phone}`}
              wide
            />
            <HrField
              label="Mẹ"
              value={`${data.guardianMother.name} · ${data.guardianMother.phone}`}
              wide
            />
          </HrFieldGrid>
        )}
      </HrSubBlock>
    </HrSectionCard>
  );
}

function OtherTab({
  data,
  editing,
  canReadSensitive,
  canUpdateSensitive,
}: {
  data: EmployeeProfile;
  editing: boolean;
  canReadSensitive: boolean;
  canUpdateSensitive: boolean;
}) {
  if (!canReadSensitive) {
    return (
      <Typography.Text type="secondary">
        Cần quyền «Xem thông tin nhạy cảm» để xem ngân hàng lương.
      </Typography.Text>
    );
  }
  const canEdit = editing && canUpdateSensitive;
  return (
    <>
      <HrSensitiveBanner />
      <HrSectionCard
        icon={<BankOutlined />}
        title="Tài chính & phương tiện"
        subtitle="Ngân hàng lương và phương tiện di chuyển"
      >
        <HrSubBlock title="Tài khoản ngân hàng">
          {canEdit ? (
            <HrFieldGrid>
              <FormField name="bankAccount.bankName" label="Ngân hàng">
                <Input />
              </FormField>
              <FormField
                name="bankAccount.accountNumber"
                label="Số tài khoản"
              >
                <Input />
              </FormField>
              <FormField name="bankAccount.branch" label="Chi nhánh">
                <Input />
              </FormField>
            </HrFieldGrid>
          ) : (
            <HrFieldGrid>
              <HrField label="Ngân hàng" value={data.bankAccount.bankName} />
              <HrField
                label="Số tài khoản"
                value={data.bankAccount.accountNumber}
                highlight
              />
              <HrField label="Chi nhánh" value={data.bankAccount.branch} />
            </HrFieldGrid>
          )}
        </HrSubBlock>
        <HrSubBlock title="Phương tiện">
          {editing ? (
            <FormField name="vehicles" label="Mô tả">
              <Input.TextArea rows={2} />
            </FormField>
          ) : (
            <HrField label="Mô tả" value={data.vehicles} wide />
          )}
        </HrSubBlock>
      </HrSectionCard>
    </>
  );
}
