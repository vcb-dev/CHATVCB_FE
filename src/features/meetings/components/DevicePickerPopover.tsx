import { SettingOutlined } from '@ant-design/icons';
import { Popover, Select, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { listMediaDevices, type MediaDeviceList } from '../meet';

type Props = {
  audioDeviceId?: string;
  videoDeviceId?: string;
  onSelectAudio: (deviceId: string) => void;
  onSelectVideo: (deviceId: string) => void;
};

export function DevicePickerPopover({
  audioDeviceId,
  videoDeviceId,
  onSelectAudio,
  onSelectVideo,
}: Props) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceList>({ mics: [], cams: [] });

  useEffect(() => {
    if (!open) {
      return;
    }
    void listMediaDevices().then(setDevices);
  }, [open]);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="top"
      content={
        <div className="meet-device-picker">
          <div className="meet-device-field">
            <label>Micro</label>
            <Select
              size="small"
              style={{ width: 240 }}
              value={audioDeviceId || devices.mics[0]?.deviceId || undefined}
              placeholder="Mặc định hệ thống"
              onChange={(val) => onSelectAudio(val)}
              options={devices.mics.map((m, idx) => ({
                value: m.deviceId,
                label: m.label || `Micro ${idx + 1}`,
              }))}
            />
          </div>
          <div className="meet-device-field">
            <label>Camera</label>
            <Select
              size="small"
              style={{ width: 240 }}
              value={videoDeviceId || devices.cams[0]?.deviceId || undefined}
              placeholder="Mặc định hệ thống"
              onChange={(val) => onSelectVideo(val)}
              options={devices.cams.map((c, idx) => ({
                value: c.deviceId,
                label: c.label || `Camera ${idx + 1}`,
              }))}
            />
          </div>
        </div>
      }
    >
      <Tooltip title="Chọn thiết bị mic & camera">
        <button type="button" className="meet-ctrl light" aria-label="Chọn thiết bị">
          <SettingOutlined />
        </button>
      </Tooltip>
    </Popover>
  );
}

