import { avatarColor, initials } from "@/lib/avatar";
import {
  ArrowLeftOutlined,
  BankOutlined,
  EditOutlined,
  IdcardOutlined,
  ReadOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Form,
  Input,
  Select,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import {
  HrDocPlaceholder,
  HrField,
  HrFieldGrid,
  HrPersonRow,
  HrSectionCard,
  HrSensitiveBanner,
  HrSubBlock,
} from "./components/HrUi";
import {
  orgDepartmentOptions,
  orgGroupOptionsForDepartment,
} from "@/features/departments/mockDepartments";
import type { EmployeeProfile } from "./types";

interface Props {
  profile: EmployeeProfile;
  onBack: () => void;
  onSave: (next: EmployeeProfile) => void;
}

const TAB_KEYS = [
  "work",
  "personal",
  "education",
  "identity",
  "family",
  "other",
] as const;

export function EmployeeDetailView({ profile, onBack, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [form] = Form.useForm<EmployeeProfile>();
  const [activeTab, setActiveTab] = useState<(typeof TAB_KEYS)[number]>("work");

  useEffect(() => {
    setDraft(profile);
    form.setFieldsValue(profile);
    setEditing(false);
  }, [profile, form]);

  function cancelEdit() {
    setDraft(profile);
    form.setFieldsValue(profile);
    setEditing(false);
  }

  function saveEdit() {
    form
      .validateFields()
      .then((values) => {
        const next = { ...draft, ...values };
        setDraft(next);
        onSave(next);
        setEditing(false);
        message.success("Đã lưu (demo — chưa gửi lên server).");
      })
      .catch(() => message.warning("Kiểm tra lại các trường bắt buộc."));
  }

  const data = editing ? draft : profile;

  return (
    <main className="hr-page hr-detail-page">
      <div className="hr-detail-hero">
        <Button
          type="text"
          className="hr-back-btn"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
        >
          Danh sách
        </Button>
        <div className="hr-detail-hero-inner">
          <Avatar
            size={72}
            style={{
              background: avatarColor(data.fullName),
              color: "#fff",
              fontWeight: 700,
              fontSize: 24,
            }}
          >
            {initials(data.fullName)}
          </Avatar>
          <div className="hr-detail-hero-text">
            <h1>{data.fullName}</h1>
            <p>
              {data.employeeCode} · {data.department} · {data.jobTitle}
            </p>
            <div className="hr-detail-tags">
              <Tag color="blue" style={{ marginRight: 10 }}>
                {data.contractType}
              </Tag>
              <Tag color="green">{data.employmentStatus}</Tag>
            </div>
          </div>
          <div className="hr-detail-hero-actions">
            {editing ? (
              <>
                <Button onClick={cancelEdit}>Hủy</Button>
                <Button type="primary" onClick={saveEdit}>
                  Lưu thay đổi
                </Button>
              </>
            ) : (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setEditing(true)}
              >
                Chỉnh sửa
              </Button>
            )}
          </div>
        </div>
      </div>

      <Form
        form={form}
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
          onChange={(key) => setActiveTab(key as (typeof TAB_KEYS)[number])}
          className="hr-detail-tabs"
          items={TAB_KEYS.map((key) => ({
            key,
            label: tabLabel(key),
          }))}
        />
        <div className="hr-detail-tab-scroll">
          <div className="hr-tab-panel">
            {tabContent(activeTab, data, editing, form)}
          </div>
        </div>
      </Form>

      {editing ? (
        <footer className="hr-edit-footer">
          <Typography.Text type="secondary">
            Tab: {tabLabel(activeTab)}
          </Typography.Text>
          <div>
            <Button onClick={cancelEdit}>Hủy</Button>
            <Button type="primary" onClick={saveEdit}>
              Lưu thay đổi
            </Button>
          </div>
        </footer>
      ) : null}
    </main>
  );
}

function tabLabel(key: (typeof TAB_KEYS)[number]) {
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
  key: (typeof TAB_KEYS)[number],
  data: EmployeeProfile,
  editing: boolean,
  _form: ReturnType<typeof Form.useForm<EmployeeProfile>>[0],
) {
  switch (key) {
    case "work":
      return <WorkTab data={data} editing={editing} />;
    case "personal":
      return <PersonalTab data={data} editing={editing} />;
    case "education":
      return <EducationTab data={data} editing={editing} />;
    case "identity":
      return <IdentityTab data={data} editing={editing} />;
    case "family":
      return <FamilyTab data={data} editing={editing} />;
    default:
      return <OtherTab data={data} editing={editing} />;
  }
}

function WorkTab({
  data,
  editing,
}: {
  data: EmployeeProfile;
  editing: boolean;
}) {
  const form = Form.useFormInstance<EmployeeProfile>();
  const departmentWatch = Form.useWatch("department", form);
  const departmentGroupOptions = orgGroupOptionsForDepartment(
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
            <HrField label="Mã định danh NV" value={data.employeeSeq} />
            <HrField label="Loại hợp đồng" value={data.contractType} />
            <HrField label="Vị trí (HĐ)" value={data.jobTitle} />
            <HrField label="Vị trí chuyên môn" value={data.specialtyPosition} />
            <HrField label="Phòng ban" value={data.department} />
            <HrField
              label="Nhóm (theo phòng ban)"
              value={data.departmentGroup}
            />
            <HrField
              label="Mã khối theo quản lý"
              value={data.managementBlockCode}
            />
            <HrField
              label="Tình trạng làm việc"
              value={data.employmentStatus}
            />
          </HrFieldGrid>
        </>
      ) : (
        <HrFieldGrid>
          <Form.Item
            name="startDate"
            label="Ngày bắt đầu làm việc"
            className="hr-form-item"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="employeeCode"
            label="Mã nhân viên"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="employeeSeq" label="Mã định danh NV">
            <Input disabled title="Chỉ HR — readonly demo" />
          </Form.Item>
          <Form.Item name="contractType" label="Loại hợp đồng">
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
          </Form.Item>
          <Form.Item name="jobTitle" label="Vị trí (HĐ)">
            <Input />
          </Form.Item>
          <Form.Item name="specialtyPosition" label="Vị trí chuyên môn">
            <Input />
          </Form.Item>
          <Form.Item name="department" label="Phòng ban">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={orgDepartmentOptions()}
              onChange={() => form.setFieldValue("departmentGroup", undefined)}
            />
          </Form.Item>
          <Form.Item name="departmentGroup" label="Nhóm (theo phòng ban)">
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
          </Form.Item>
          <Form.Item name="managementBlockCode" label="Mã khối theo quản lý">
            <Input />
          </Form.Item>
          <Form.Item name="directManagerName" label="Quản lý trực tiếp">
            <Input />
          </Form.Item>
          <Form.Item name="employmentStatus" label="Tình trạng làm việc">
            <Select
              options={[
                { value: "Đang làm việc", label: "Đang làm việc" },
                { value: "Thử việc", label: "Thử việc" },
                { value: "Nghỉ phép dài hạn", label: "Nghỉ phép dài hạn" },
                { value: "Đã nghỉ việc", label: "Đã nghỉ việc" },
              ]}
            />
          </Form.Item>
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
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="gender" label="Giới tính">
            <Select
              options={[{ value: "Nam" }, { value: "Nữ" }, { value: "Khác" }]}
            />
          </Form.Item>
          <Form.Item name="dateOfBirth" label="Ngày sinh">
            <Input placeholder="dd/mm/yyyy" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="maritalStatus" label="Tình trạng hôn nhân">
            <Input />
          </Form.Item>
          <Form.Item name="ethnicity" label="Dân tộc">
            <Input />
          </Form.Item>
          <Form.Item name="religion" label="Tôn giáo">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ hiện tại" className="wide">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="permanentAddress"
            label="Hộ khẩu thường trú"
            className="wide"
          >
            <Input.TextArea rows={2} />
          </Form.Item>
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
          <Form.Item name="educationLevel" label="Trình độ học vấn">
            <Input />
          </Form.Item>
          <Form.Item name="schoolName" label="Trường / cơ sở đào tạo">
            <Input />
          </Form.Item>
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
}: {
  data: EmployeeProfile;
  editing: boolean;
}) {
  return (
    <>
      <HrSensitiveBanner />
      <HrSectionCard
        icon={<IdcardOutlined />}
        title="Giấy tờ & bảo hiểm"
        subtitle="CCCD và số sổ BHXH"
      >
        {editing ? (
          <HrFieldGrid>
            <Form.Item name="citizenIdNumber" label="Số CCCD">
              <Input />
            </Form.Item>
            <Form.Item name="citizenIdIssuedPlace" label="Nơi cấp">
              <Input />
            </Form.Item>
            <Form.Item name="socialInsuranceNumber" label="Số sổ bảo hiểm">
              <Input />
            </Form.Item>
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
          <HrDocPlaceholder label="Mặt trước CCCD" />
          <HrDocPlaceholder label="Mặt sau CCCD" />
        </div>
      </HrSectionCard>
    </>
  );
}

function FamilyTab({
  data,
  editing,
}: {
  data: EmployeeProfile;
  editing: boolean;
}) {
  const childText =
    data.children.length === 0
      ? "Chưa khai báo"
      : data.children
          .map(
            (c, i) =>
              `Con ${i + 1}: ${c.fullName}${c.dateOfBirth ? ` (${c.dateOfBirth})` : ""}`,
          )
          .join("\n");

  return (
    <HrSectionCard
      icon={<TeamOutlined />}
      title="Gia đình & liên hệ"
      subtitle="Con cái, khẩn cấp và người giám hộ"
    >
      <HrSubBlock title="Liên hệ khẩn cấp">
        {editing ? (
          <HrFieldGrid>
            <Form.Item name={["emergencyContact", "name"]} label="Họ tên">
              <Input />
            </Form.Item>
            <Form.Item
              name={["emergencyContact", "relationship"]}
              label="Quan hệ"
            >
              <Input />
            </Form.Item>
            <Form.Item
              name={["emergencyContact", "phone"]}
              label="Số điện thoại"
            >
              <Input />
            </Form.Item>
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
      <HrSubBlock title="Thông tin con cái">
        {editing ? (
          <Form.Item name="vehicles" label="Ghi chú con cái (demo text)">
            <Input.TextArea rows={2} placeholder={childText} disabled />
          </Form.Item>
        ) : (
          <HrField label="Danh sách" value={childText} wide />
        )}
      </HrSubBlock>
      <HrSubBlock title="Người giám hộ">
        {editing ? (
          <HrFieldGrid>
            <Form.Item name={["guardianFather", "name"]} label="Cha — họ tên">
              <Input />
            </Form.Item>
            <Form.Item name={["guardianFather", "phone"]} label="Cha — SĐT">
              <Input />
            </Form.Item>
            <Form.Item name={["guardianMother", "name"]} label="Mẹ — họ tên">
              <Input />
            </Form.Item>
            <Form.Item name={["guardianMother", "phone"]} label="Mẹ — SĐT">
              <Input />
            </Form.Item>
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
}: {
  data: EmployeeProfile;
  editing: boolean;
}) {
  return (
    <>
      <HrSensitiveBanner />
      <HrSectionCard
        icon={<BankOutlined />}
        title="Tài chính & phương tiện"
        subtitle="Ngân hàng lương và phương tiện di chuyển"
      >
        <HrSubBlock title="Tài khoản ngân hàng">
          {editing ? (
            <HrFieldGrid>
              <Form.Item name={["bankAccount", "bankName"]} label="Ngân hàng">
                <Input />
              </Form.Item>
              <Form.Item
                name={["bankAccount", "accountNumber"]}
                label="Số tài khoản"
              >
                <Input />
              </Form.Item>
              <Form.Item name={["bankAccount", "branch"]} label="Chi nhánh">
                <Input />
              </Form.Item>
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
            <Form.Item name="vehicles" label="Mô tả">
              <Input.TextArea rows={2} />
            </Form.Item>
          ) : (
            <HrField label="Mô tả" value={data.vehicles} wide />
          )}
        </HrSubBlock>
      </HrSectionCard>
    </>
  );
}
