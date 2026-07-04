import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Logout, TroubleshootSharp, AdsClickSharp,
  ChargingStation, ChevronLeftRounded, Dashboard
} from '@mui/icons-material';


interface SidebarProps {
  isOpen: boolean;
  // onLogout: () => void;
}

export default function Sidebar({ isOpen, }: SidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>('documents');

  const navigationGroups = [
    // {
    //   id: '0verview',
    //   label: 'Overview',
    //   icon: Dashboard,
    //   items: [
    //     { label: "Vendor Engineering Drawing", url: "document/vendor-engineering-drawing" },
    //     { label: "Movement Technical Data", url: "document/movement-tech-data" },
    //     { label: "Product Specification", url: "document/product-specification" },
    //   ]
    // },
    {
      id: '0verview_management',
      label: 'Management',
      items: [
        { label: "Overview", icon: Dashboard, url: "/seller/dashboard" },
        { label: "Product Management", icon: TroubleshootSharp, url: "/seller/product-management" },
        { label: "Coupon Management", icon: AdsClickSharp, url: "/seller/coupen-management" },
      ]
    },
    {
      id: 'reporting',
      label: 'Reporting',
      icon: ChargingStation,
      items: [
        { label: "Sales Analytics", url: "reporting/deviation" },
        { label: "Drawing Marking", url: "reporting/drawing-marking" },
      ]
    }
  ];

  const handleNavigation = (url: string) => navigate(`/${url}`);

  return (
    <aside
      style={{ transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      className={`fixed top-0 left-0 z-40 h-screen flex flex-col bg-surface-container-low border-r border-outline-variant/30 select-none overflow-hidden ${isOpen ? 'w-[100px]' : 'w-68'
        }`}
    >
      {/* Header */}
      <div className="flex items-center px-4 py-5 border-b border-outline-variant/20">
        {/* Logo Area */}
        <div className="w-10 h-10 rounded-full bg-primary-container border-2 border-primary/20 flex items-center justify-center shrink-0">
          <span className="text-primary font-bold text-lg">P</span>
        </div>

        {/* Text Area */}
        {!isOpen && (
          <div className="ml-3 flex flex-col items-start min-w-0">
            <span className="text-sm font-extrabold text-on-surface truncate mb-1">
              PETO Seller Center
            </span>
            <span className="inline-block px-2 py-0.5 rounded-full bg-surface-container-high text-[10px] font-medium text-on-surface-variant border border-outline-variant/30 truncate max-w-full">
              Shop Name
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-grow overflow-y-auto py-4 px-3 space-y-1">
        {navigationGroups.map((group) => (
          <div key={group.id}>
            {group.icon ? (
              <button
                onClick={() => setOpenMenu(openMenu === group.id ? null : group.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all`}
              >
                <group.icon className="h-5 w-5" />
                {!isOpen && <span className="flex-1 text-left font-medium">{group.label}</span>}
                {!isOpen && <ChevronLeftRounded className={`h-4 w-4 transition-transform ${openMenu === group.id ? "rotate-180" : ""}`} />}
              </button>
            ) : null}

            {/* Sub-items */}
            {(!group.icon || openMenu === group.id) && group.items.map((item: any) => (
              <button
                key={item.label}
                onClick={() => handleNavigation(item.url)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 ml-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high ${pathname.includes(item.url) ? 'bg-primary-container text-on-primary-container' : ''
                  }`}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {!isOpen && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-outline-variant/30">
        <button
          // onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-error hover:bg-error-container font-semibold"
        >
          <Logout className="h-5 w-5" />
          {!isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}