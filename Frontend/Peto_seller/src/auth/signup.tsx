
import  { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { Visibility,VisibilityOff,ShoppingBasket } from '@mui/icons-material';
import Button from '../components/button';


const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function signup() {
    const navigate = useNavigate();
    const [bizName, setBizName] = useState('');
    const [category, setCategory] = useState('Pet Food Brand');
    const [contactName, setContactName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleGoogle = async () => {
        setGoogleLoading(true);
        // const { error } = "Error";
    //   (  if (error) { setErrorMsg(error);)  }
    setGoogleLoading(false);
    };
    return (
        <div className="bg-background text-on-background min-h-screen flex overflow-x-hidden pt-20 select-none relative">

            {/* Transactional Top Header */}
            <header className="w-full h-20 bg-white border-b border-outline-variant/10 fixed top-0 left-0 right-0 z-50">
                <div className="flex justify-between items-center px-6 md:px-10 py-4 max-w-[1280px] mx-auto h-full">
                    <div

                        className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-2 cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-primary text-3xl fill-icon">pets</span>
                        <span>Pawfect Pals Partner</span>
                    </div>
                    <div className="flex gap-2">
                        <button className="text-primary p-2 rounded-full hover:bg-surface-container transition-colors" title="Back to Shopper Site">
                            <ShoppingBasket className="material-symbols-outlined" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="w-full flex h-[calc(100vh-80px)] overflow-hidden">

                {/* Left Side: Stats and Info Column */}
                <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden h-full select-none">
                    <img
                        alt="Pet supplies shipping"
                        className="absolute inset-0 w-full h-full object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrslIAC8rVFQrnzl1DjYuQs--pezZIB9O6HqGUZMjyC8u5qgfmk4TnxxHBu_Kf2A-IuN14Ae8uQ_JFGgU28ZKsItQY-ogFebCoWc9asTfHuCn1lwYMosehPrV4bLHc5mtBEOlY6mpXC6mMRu-s2TQaFnxrYx8GFg5hfCrYjr3zXSmxlyIwdBCdnBhTFhV6fVBxKcXiQZTpqNU7nyiqsE6CnZuEiZqTCklVRoQwQgnZ9oaebI9ax-vCV4_HdruMKMcn2HKzzdUXypAy"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-black/30"></div>

                    <div className="absolute inset-0 flex flex-col justify-end p-16 text-white  z-10">
                        <div className="max-w-md">
                            <h2 className="font-headline-xl text-headline-xl mb-4 leading-tight drop-shadow-md">
                                Empowering Pet Merchants.
                            </h2>
                            <p className="font-body-lg text-body-lg opacity-90 leading-relaxed">
                                Partner with Pawfect Pals and gain instant distribution to active pet owners, certified vets, and wellness coordinators looking for high-quality pet supplies.
                            </p>
                        </div>

                        <div className="flex gap-8">
                            <div className="flex flex-col">
                                <span className="font-headline-md text-headline-md font-bold">100k+</span>
                                <span className="font-label-sm text-label-sm opacity-80 font-semibold">Orders Completed</span>
                            </div>
                            <div className="w-px h-12 bg-white/30"></div>
                            <div className="flex flex-col">
                                <span className="font-headline-md text-headline-md font-bold">24-Hr</span>
                                <span className="font-label-sm text-label-sm opacity-80 font-semibold font-bold">Merchant Onboarding</span>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-10 left-10 flex items-center gap-2 bg-white/10 backdrop-blur-md py-3 px-5 rounded-full border border-white/20 select-none z-20">
                        <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
                        <span className="font-headline-md text-headline-md font-bold text-white">Pawfect Pals Partner</span>
                    </div>
                </section>

                {/* Right Side: Form */}
                <section className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 md:px-16 bg-surface-container-lowest h-full overflow-y-auto">
                    <div className="w-full max-w-md py-6 animate-in">

                        {/* Mobile Branding */}
                        <div className="lg:hidden flex justify-center mb-8">
                            <div className="flex items-center gap-2 cursor-pointer">
                                <span className="material-symbols-outlined text-primary text-3xl font-bold fill-icon">pets</span>
                                <span className="font-headline-md text-headline-md font-bold text-primary">Pawfect Partner</span>
                            </div>
                        </div>

                        <header className="mb-8 text-center lg:text-left space-y-2">
                            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Register as a Partner</h1>
                            <p className="font-body-md text-body-md text-on-surface-variant font-medium">Start selling premium pet supplies on our platform.</p>
                        </header>

                        {/* Google */}
                        <button type="button" onClick={handleGoogle} disabled={googleLoading}
                            className="w-full flex items-center justify-center gap-3 py-3.5 border-2 border-outline-variant/30 rounded-xl bg-white hover:bg-surface-container-low font-semibold text-sm transition-all active:scale-[0.98] shadow-sm disabled:opacity-60 mb-5">
                            {googleLoading ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <GoogleIcon />}
                            Continue with Google
                        </button>

                        <div className="relative mb-5 flex items-center">
                            <div className="flex-grow border-t border-outline-variant/30" />
                            <span className="flex-shrink mx-4 text-xs font-semibold text-outline-variant uppercase tracking-widest">or email</span>
                            <div className="flex-grow border-t border-outline-variant/30" />
                        </div>

                        {emailSent ? (
                            <div className="text-center py-8 space-y-4 animate-in">
                                <div className="w-20 h-20 bg-tertiary/10 rounded-full flex items-center justify-center mx-auto">
                                    <span className="material-symbols-outlined text-tertiary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
                                </div>
                                <h3 className="font-bold text-xl text-on-surface">Check your inbox!</h3>
                                <p className="text-sm text-on-surface-variant leading-relaxed">
                                    A confirmation link was sent to <strong>{email}</strong>.<br />
                                    Click the link in the email to activate your merchant account, then return here to sign in.
                                </p>
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold text-left flex gap-2">
                                    <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">info</span>
                                    If you don't see it, check your spam folder. The link expires in 24 hours.
                                </div>
                                <button
                                    className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-xl shadow-sm hover:brightness-105 active:scale-[0.98] transition-all mt-2"
                                >
                                    Go to Seller Login
                                </button>
                            </div>
                        ) : (
                            <form className="space-y-5">
                                {errorMsg && (
                                    <div className="p-3 bg-error-container text-on-error-container rounded-lg text-body-sm font-semibold">
                                        {errorMsg}
                                    </div>
                                )}

                                {/* Business Name */}
                                <div>
                                    <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 font-bold" htmlFor="biz-name">Business Name</label>
                                    <input
                                        type="text"
                                        id="biz-name"
                                        placeholder="e.g. Premium Kibble Co."
                                        value={bizName}
                                        onChange={(e) => { setBizName(e.target.value); setErrorMsg(''); }}
                                        className="w-full bg-[#F3F4F6] border-none rounded-lg py-3 px-4 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none focus:bg-white focus:ring-2 focus:ring-secondary-container"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Category Selection */}
                                    <div>
                                        <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 font-bold" htmlFor="biz-category">Category</label>
                                        <select
                                            id="biz-category"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="w-full bg-[#F3F4F6] border-none rounded-lg py-3.5 px-4 font-body-md text-body-md text-on-surface focus:bg-white focus:ring-2 focus:ring-secondary-container outline-none cursor-pointer"
                                        >
                                            <option>Pet Food Brand</option>
                                            <option>Toys & Accessories</option>
                                            <option>Pet Wellness / Pharmacy</option>
                                            <option>Veterinary Service</option>
                                            <option>Other Supplies</option>
                                        </select>
                                    </div>
                                    {/* Contact Name */}
                                    <div>
                                        <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 font-bold" htmlFor="contact-name">Contact Person</label>
                                        <input
                                            type="text"
                                            id="contact-name"
                                            placeholder="John Doe"
                                            value={contactName}
                                            onChange={(e) => { setContactName(e.target.value); setErrorMsg(''); }}
                                            className="w-full bg-[#F3F4F6] border-none rounded-lg py-3 px-4 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none focus:bg-white focus:ring-2 focus:ring-secondary-container"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 font-bold" htmlFor="email">Business Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        placeholder="partner@example.com"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
                                        className="w-full bg-[#F3F4F6] border-none rounded-lg py-3 px-4 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none focus:bg-white focus:ring-2 focus:ring-secondary-container"
                                        required
                                    />
                                </div>

                                {/* Password */}
                                <div className="relative">
                                    <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5 font-bold" htmlFor="password">Password</label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        placeholder="Min. 8 characters"
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                                        className="w-full bg-[#F3F4F6] border-none rounded-lg py-3 px-4 font-body-md text-body-md text-on-surface placeholder:text-outline-variant outline-none focus:bg-white focus:ring-2 focus:ring-secondary-container pr-12"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-[42px] text-on-surface-variant hover:text-primary transition-colors"
                                    >
                                        {showPassword ? <VisibilityOff className="material-symbols-outlined" /> : <Visibility className="material-symbols-outlined" />}
                                    </button>
                                </div>

                                {/* Accept terms */}
                                <div className="flex items-start gap-3 py-2 select-none">
                                    <input
                                        type="checkbox"
                                        id="terms"
                                        checked={acceptTerms}
                                        onChange={() => { setAcceptTerms(!acceptTerms); setErrorMsg(''); }}
                                        className="mt-1 w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary-container cursor-pointer"
                                        required
                                    />
                                    <label className="font-body-sm text-body-sm text-on-surface-variant cursor-pointer font-semibold" htmlFor="terms">
                                        I agree to the <a href="#" onClick={e => e.preventDefault()} className="text-primary hover:underline">Merchant Terms & Conditions</a> and the <a href="#" onClick={e => e.preventDefault()} className="text-primary hover:underline">Seller Fee Policy</a>.
                                    </label>
                                </div>
                                <Button isloading={loading} Button_name={'Submit Application'}  Button_loading_name="Submitting..." />
                            </form>
                        )}

                        <footer className="mt-8 text-center select-none">
                            <p className="font-body-md text-body-md text-on-surface-variant">
                                Already have a partner account?
                                <button
                                    type="button"
                                    onClick={() => navigate('/seller/login')}
                                    className="text-secondary font-bold hover:underline decoration-2 underline-offset-4 ml-1.5 focus:outline-none"
                                >
                                    Merchant Login
                                </button>
                            </p>
                        </footer>

                        {/* Micro-footer */}
                        <div className="w-full flex justify-between items-center mt-12 pb-4 text-label-sm text-outline select-none">
                            <span>© 2024 Pawfect Pals Partner</span>
                            <div className="flex gap-4">
                                <a href="#" className="hover:text-primary transition-colors">Help</a>
                                <a href="#" className="hover:text-primary transition-colors">Terms</a>
                            </div>
                        </div>

                    </div>
                </section>

            </main>

        </div>
    )
}
