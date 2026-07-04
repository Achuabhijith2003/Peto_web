import  {useState} from 'react'


export default function Dashboard() {
    const [activeListingsCount, setActiveListingsCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState('$0.00');
  const [pendingOrders, setPendingOrders] = useState(7);
  const [loading, setLoading] = useState(false);
  // const [toastText, setToastText] = useState<{ title: string; body: string } | null>(null);
  return (
    <div className="space-y-8 animate-in select-none">
        
        {/* Welcome Banner */}
        <section className="bg-primary/5 p-6 rounded-xl border border-primary/10 flex justify-between items-center">
          <div>
            <h2 className="font-headline-lg text-xl font-bold text-on-surface">Welcome back to Seller Center!</h2>
            <p className="text-body-sm text-on-surface-variant font-medium mt-1">Here is a quick snapshot of how your store Store_name is performing.</p>
          </div>
          {loading && (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          )}
        </section>

        {/* Metrics Panel */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-level-1 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-label-sm text-on-surface-variant font-semibold">Total Revenue</p>
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{totalRevenue}</h3>
              <p className="text-[11px] text-tertiary flex items-center font-bold">
                <span className="material-symbols-outlined text-xs mr-0.5">trending_up</span> +12.5% this month
              </p>
            </div>
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl fill-icon">payments</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-level-1 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-label-sm text-on-surface-variant font-semibold">Active Listings</p>
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{activeListingsCount}</h3>
              <p className="text-[11px] text-on-surface-variant">Store items available</p>
            </div>
            <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl fill-icon">inventory</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-level-1 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-label-sm text-on-surface-variant font-semibold">Pending Orders</p>
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{pendingOrders}</h3>
              <p className="text-[11px] text-error flex items-center font-bold">
                <span className="material-symbols-outlined text-xs mr-0.5">warning</span> Needs shipping
              </p>
            </div>
            <div className="w-12 h-12 bg-tertiary/10 text-tertiary rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl fill-icon">local_shipping</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-level-1 flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-label-sm text-on-surface-variant font-semibold">Store Rating</p>
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">4.9 / 5.0</h3>
              <p className="text-[11px] text-on-surface-variant">Based on 84 reviews</p>
            </div>
            <div className="w-12 h-12 bg-primary-container/20 text-primary-container rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl fill-icon">star</span>
            </div>
          </div>
        </section>

        {/* Charts Bento Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-outline-variant/20 shadow-level-1 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-headline-md text-body-lg font-bold text-on-surface">Sales Performance</h3>
                <p className="text-label-sm text-on-surface-variant font-semibold">Monthly merchant sales trends</p>
              </div>
              <button className="text-secondary hover:underline text-label-sm font-bold">
                Go to Full Analytics
              </button>
            </div>
            
            <div className="relative w-full h-64 bg-surface-bright/50 rounded-xl overflow-hidden flex flex-col justify-end p-4 border border-outline-variant/10">
              <svg className="w-full h-[80%] absolute bottom-12 left-0 right-0 px-2" viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#2170e4', stopOpacity: 0.25 }} />
                    <stop offset="100%" style={{ stopColor: '#2170e4', stopOpacity: 0.0 }} />
                  </linearGradient>
                </defs>
                <path d="M 0 160 Q 120 120 240 140 T 480 40 T 600 20" fill="none" stroke="#2170e4" strokeWidth="4" />
                <path d="M 0 160 Q 120 120 240 140 T 480 40 T 600 20 L 600 200 L 0 200 Z" fill="url(#grad)" />
              </svg>
              <div className="flex justify-between text-[11px] font-semibold text-on-surface-variant select-none border-t border-outline-variant/20 pt-3 z-10 bg-white">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
              </div>
            </div>
          </div>

          {/* Recent Alerts Activity */}
          <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl border border-outline-variant/20 shadow-level-1 flex flex-col justify-between">
            <div>
              <h3 className="font-headline-md text-body-lg font-bold text-on-surface mb-6">Recent Alerts</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 border-b border-outline-variant/10 pb-3">
                  <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">shopping_cart</span>
                  <div>
                    <p className="font-label-md text-on-surface font-semibold text-sm">New Order #8402</p>
                    <p className="text-body-sm text-on-surface-variant">Buddy's Salmon Kibble • $45.99</p>
                    <span className="text-[10px] text-outline font-semibold">2 mins ago</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-b border-outline-variant/10 pb-3">
                  <span className="material-symbols-outlined text-error bg-error/10 p-2 rounded-lg">warning</span>
                  <div>
                    <p className="font-label-md text-on-surface font-semibold text-sm">Low Stock Alert</p>
                    <p className="text-body-sm text-on-surface-variant">CloudSoft Ortho Bed (Gray, L)</p>
                    <span className="text-[10px] text-outline font-semibold">1 hour ago</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary bg-tertiary/10 p-2 rounded-lg">reviews</span>
                  <div>
                    <p className="font-label-md text-on-surface font-semibold text-sm">New 5-star Review</p>
                    <p className="text-body-sm text-on-surface-variant">"Luna loves the chew toy!" - Jane D.</p>
                    <span className="text-[10px] text-outline font-semibold">3 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
            <button 
              className="w-full py-2.5 mt-4 text-secondary hover:bg-secondary/5 font-bold rounded-lg transition-colors border border-secondary/20 text-label-sm"
            >
              View All Activity
            </button>
          </div>
        </section>

        {/* Quick Shortcut Navigation Buttons */}
        <section className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-level-1">
          <h3 className="font-headline-md text-body-lg font-bold text-on-surface mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-outline-variant/20 hover:bg-surface-container transition-all gap-2 text-center"
            >
              <span className="material-symbols-outlined text-3xl text-primary font-bold">inventory</span>
              <span className="text-xs font-bold text-on-surface">Manage Catalog</span>
            </button>
            <button 
             
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-outline-variant/20 hover:bg-surface-container transition-all gap-2 text-center"
            >
              <span className="material-symbols-outlined text-3xl text-secondary font-bold">confirmation_number</span>
              <span className="text-xs font-bold text-on-surface">Discount Coupons</span>
            </button>
            <button 
             
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-outline-variant/20 hover:bg-surface-container transition-all gap-2 text-center"
            >
              <span className="material-symbols-outlined text-3xl text-tertiary font-bold">insights</span>
              <span className="text-xs font-bold text-on-surface">Full Sales Report</span>
            </button>
            <button 
             
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-outline-variant/20 hover:bg-surface-container transition-all gap-2 text-center"
            >
              <span className="material-symbols-outlined text-3xl text-outline font-bold">storefront</span>
              <span className="text-xs font-bold text-on-surface">Console Settings</span>
            </button>
          </div>
        </section>
      </div>

    //   {/* Success Toast */}
    //   {toastText && (
    //     <div className="fixed bottom-8 right-8 bg-white border-l-4 border-tertiary shadow-2xl p-4 rounded-r-lg flex items-center gap-4 transition-all duration-500 z-55 animate-in">
    //       <div className="bg-tertiary-fixed-dim/20 p-2 rounded-full text-tertiary">
    //         <span className="material-symbols-outlined">check_circle</span>
    //       </div>
    //       <div>
    //         <p className="font-label-md text-label-md text-on-surface font-bold">{toastText.title}</p>
    //         <p className="font-body-sm text-body-sm text-on-surface-variant">{toastText.body}</p>
    //       </div>
    //       <button
    //         className="ml-4 text-outline hover:text-on-surface"
    //         onClick={() => setToastText(null)}
    //       >
    //         <span className="material-symbols-outlined text-[18px]">close</span>
    //       </button>
    //     </div>
    //   )}
    // </SellerLayout>
  )
}
