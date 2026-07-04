import { useState } from 'react';
import { Lock, Email, Visibility, VisibilityOff, ShoppingBasket } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Button from '../components/button';


const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);


  const handleSignin = async () => {
    setLoading(true);
    // setErrorMsg('');
    navigate("/seller/dashboard")
  }


  return (
    <div className="min-h-screen flex flex-col font-body-md text-body-md text-on-surface bg-background select-none">
      <header className="w-full h-20 bg-white border-b border-outline-variant/10 fixed top-0 left-0 right-0 z-50">
        <div className="flex justify-between items-center px-6 md:px-10 py-4 max-w-[1280px] mx-auto h-full">
          <div className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
            <span>Pawfect Pals Partner</span>
          </div>
          <button className="text-primary p-2 rounded-full hover:bg-surface-container transition-colors" title="Back to shop">
            <ShoppingBasket className="material-symbols-outlined" />
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col md:flex-row pt-20 h-[calc(100vh-80px)] overflow-hidden">
        <section className="hidden md:block md:w-1/2 relative bg-surface-container-high h-full select-none">
          <img alt="Merchant pets supplies shop" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuARDdtpaJoW7f6aRMmXWNJlkNI7altYkpQU8Tvqx8NInKNLugB43v4EXxhlsSIDhJlMIClH8FIb60DnHLI28fCoBoixVdIX13Ra1p6i6KCIHVRnrw35-9fYd9z-80UwSF_foreSAVHHHl-4-bUcbPawJdlrHGdAo7AAWBAJ_7o-J61yqlmtEo77ym8Ai_NmNzUVdPIcVoXqZCVrmGtLHc8eGdTM4fdHJhYOJ-nvy_c7o6M4hRHqn3OAJcRSC2ZX6pDEgMeetc_v6LOV" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-black/30" />
          <div className="absolute bottom-12 left-12 max-w-md space-y-6 z-10 text-white">
            <h2 className="font-headline-xl text-headline-xl mb-4 drop-shadow-md leading-tight">Grow your business with Pawfect Pals.</h2>
            <p className="font-body-lg opacity-90 leading-relaxed">List premium products, manage shipments, track analytics, and connect with thousands of active pet owners.</p>
            <div className="mt-12 flex gap-8">
              <div className="flex flex-col"><span className="font-bold text-2xl">1,200+</span><span className="text-xs opacity-80 font-semibold">Active Merchants</span></div>
              <div className="w-px h-12 bg-white/30" />
              <div className="flex flex-col"><span className="font-bold text-2xl">4.8 / 5.0</span><span className="text-xs opacity-80 font-semibold">Merchant Rating</span></div>
            </div>
          </div>
        </section>

        <section className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-10 bg-surface-container-lowest overflow-y-auto h-full">
          <div className="w-full max-w-[440px] py-6">
            <div className="md:hidden flex justify-center mb-8">
              <div className="flex items-center gap-2 cursor-pointer">
                <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
                <span className="font-bold text-xl text-primary">Pawfect Merchant</span>
              </div>
            </div>

            <div className="mb-8 space-y-1">
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Merchant Console</h1>
              <p className="text-sm text-on-surface-variant">Access your dashboard, inventory tools, and store settings.</p>
            </div>

            {/* Google */}
            <button
              type="button"
              //   onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 border-2 border-outline-variant/30 rounded-xl bg-white hover:bg-surface-container-low font-semibold text-sm transition-all active:scale-[0.98] shadow-sm mb-5 disabled:opacity-60"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="relative mb-5 flex items-center">
              <div className="flex-grow border-t border-outline-variant/30" />
              <span className="flex-shrink mx-4 text-xs font-semibold text-outline-variant uppercase tracking-widest">or email</span>
              <div className="flex-grow border-t border-outline-variant/30" />
            </div>

            <form className="space-y-5">
              {errorMsg && (
                <div className="p-3 bg-error-container text-on-error-container rounded-xl text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>{errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-sm text-on-surface-variant ml-1" htmlFor="email">Business Email</label>
                <div className="relative">
                  <Email className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    id="email"
                    placeholder="partner@paws.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-none rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-secondary/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="font-semibold text-sm text-on-surface-variant" htmlFor="password">Password</label>
                  <button onClick={() => navigate('/seller/forgot-password')} type="button" className="text-xs text-secondary hover:underline font-semibold">Forgot?</button>
                </div>
                <div className="relative">
                  <Lock className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-100 border-none rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-secondary/20 transition-all"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface-variant">
                    {showPassword ? <VisibilityOff className="material-symbols-outlined" /> : <Visibility className="material-symbols-outlined" />}
                  </button>
                </div>
              </div>
              <Button isloading={loading} Button_name={'Sign In to Console'} Button_loading_name={'Signing In...'} onClick={handleSignin}/>

              <p className="text-center text-sm text-on-surface-variant">
                Interested in listing items?{' '}
                <button onClick={() => navigate('/seller/signup')} type="button" className="text-primary font-bold hover:underline ml-1">Partner With Us</button>
              </p>

              {/* Demo hint */}
              <div className="mt-2 p-3 bg-primary/5 border border-primary/15 rounded-xl text-xs text-on-surface-variant text-center leading-relaxed">
                <span className="font-bold text-primary">Demo:</span> Use <strong>seller@pawfect.com</strong> / <strong>password123</strong>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
