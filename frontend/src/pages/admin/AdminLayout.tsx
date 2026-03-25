import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const navLinks = [
  { to: '/admin/pairs', label: '语言对管理' },
  { to: '/admin/testers', label: '测试人员' },
  { to: '/admin/results', label: '测试结果' },
];

export default function AdminLayout() {
  const nav = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    nav('/');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-[14px] font-semibold text-gray-900 tracking-tight">Timekettle 管理后台</h1>
            <nav className="flex gap-0.5">
              {navLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-[13px] font-medium transition ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <NavLink
              to="/admin/magic"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition ${
                  isActive
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                }`
              }
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              魔法导入
            </NavLink>
            <button
              onClick={handleLogout}
              className="text-[13px] text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              退出
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
