import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { 
  ChevronLeft, 
  Menu, 
  NotificationsNone, 
  HelpCenter, 
  SettingsOutlined 
} from '@mui/icons-material';

const Layout = () => {
  // Note: Adjust the true/false logic based on your Sidebar's prop expectations.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex w-full h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={!isSidebarOpen} />

      {/* Main Content Area */}
      <main 
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'ml-60' : 'ml-[60px]'
        }`}
      >
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-6 h-16 bg-[#f9fafe] border-b border-gray-200 shrink-0 z-10">
          
          {/* Left Side: Toggle & Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center focus:outline-none"
              aria-label="Toggle Sidebar"
            >
              {isSidebarOpen ? (
                <ChevronLeft className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            <h1 className="text-xl font-medium text-primary">
              Seller Center
            </h1>
          </div>

          {/* Right Side: Actions & Profile */}
          <div className="flex items-center gap-4">
            
            {/* Action Icons */}
            <div className="flex items-center gap-2 text-gray-700">
              <button className="relative p-2 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center">
                <NotificationsNone className="h-6 w-6" />
                {/* Red Notification Dot */}
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-600 rounded-full border border-white"></span>
              </button>
              
              <button className="p-2 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center">
                <HelpCenter className="h-6 w-6" />
              </button>
              
              <button className="p-2 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center">
                <SettingsOutlined className="h-6 w-6" />
              </button>
            </div>

            {/* Vertical Divider */}
            <div className="h-8 w-px bg-gray-300 mx-1"></div>

            {/* User Profile */}
            <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
              <div className="w-10 h-10 rounded-full border-2 border-[#e69830] overflow-hidden shrink-0">
                <img 
                  src="https://i.pravatar.cc/150?img=11" 
                  alt="Alex River" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-gray-900 leading-tight truncate">
                  Alex River
                </span>
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mt-0.5 truncate">
                  Store Owner
                </span>
              </div>
            </div>

          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-auto p-4 hide-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;