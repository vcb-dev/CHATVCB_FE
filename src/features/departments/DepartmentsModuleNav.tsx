interface DepartmentsModuleNavProps {
  active: 'departments' | 'projects';
  onChange: (tab: 'departments' | 'projects') => void;
}

export function DepartmentsModuleNav({ active, onChange }: DepartmentsModuleNavProps) {
  return (
    <nav className="dept-module-nav" aria-label="Phòng ban và nhóm">
      <button
        type="button"
        className={`dept-module-nav-btn${active === 'departments' ? ' active' : ''}`}
        onClick={() => onChange('departments')}
      >
        Phòng ban &amp; nhóm
      </button>
      <button
        type="button"
        className={`dept-module-nav-btn${active === 'projects' ? ' active' : ''}`}
        onClick={() => onChange('projects')}
      >
        Dự án
      </button>
    </nav>
  );
}
