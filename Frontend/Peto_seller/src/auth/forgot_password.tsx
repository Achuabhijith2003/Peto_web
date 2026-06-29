import { useState } from 'react';
import { Email, ChevronLeft, VerifiedUser, ArrowForward, MarkEmailRead, Info } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Button from '../components/button';

export default function forgot_password() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [sent, setSent] = useState(false);

    const sendMail = async () => {
        setLoading(true);
        setSent(true)
        // const { error } = "Error";
        //   (  if (error) { setErrorMsg(error);)  }
        setLoading(false);
    };
    return (
        <div className="min-h-screen flex flex-col font-body-md text-body-md text-on-surface bg-background pt-20 select-none">

            {/* Header Navigation */}
            <header className="w-full h-20 flex items-center justify-center bg-white border-b border-outline-variant/10 fixed top-0 left-0 right-0 z-50">
                <div
                    className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-2 cursor-pointer"
                >
                    <span className="material-symbols-outlined text-primary text-3xl fill-icon">pets</span>
                    <span>Pawfect Pals Partner</span>
                </div>
            </header>

            <main className="flex-grow flex items-center justify-center px-6 py-12 pt-5">
                <div className="w-full max-w-[480px] bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden flex flex-col items-center p-8 md:p-12 border border-surface-variant/30 animate-in">

                    {/* Icon */}
                    <div className="relative w-32 h-32 mb-8 flex items-center justify-center bg-surface-container rounded-full overflow-hidden select-none">
                        <div className="absolute inset-0 bg-primary-container/10" />
                        <span className="material-symbols-outlined text-[64px] text-primary">lock_reset</span>
                        <div className="absolute top-2 right-4 text-tertiary">
                            <span className="material-symbols-outlined text-xl">pets</span>
                        </div>
                        <div className="absolute bottom-4 left-2 text-secondary">
                            <span className="material-symbols-outlined text-xl">key</span>
                        </div>
                    </div>

                    {sent ? (
                        /* ── Sent confirmation ── */
                        <div className="w-full text-center space-y-5 animate-in">
                            <div className="w-16 h-16 bg-tertiary/10 rounded-full flex items-center justify-center mx-auto">
                                <MarkEmailRead className="material-symbols-outlined text-tertiary text-4xl" style={{ fontVariationSettings: "'FILL' 4" }} />
                            </div>
                            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Email Sent!</h2>
                            <p className="text-sm text-on-surface-variant leading-relaxed">
                                Password reset instructions have been sent to <strong>{email}</strong>.<br />
                                Click the link in the email to create a new password.
                            </p>
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold text-left flex gap-2">
                                <Info className="material-symbols-outlined text-[16px] shrink-0 mt-0.5" />
                                Check your spam folder if you don't see it. The reset link expires in 1 hour.
                            </div>
                            <button
                                onClick={() => navigate('/seller/login')}
                                className="w-full py-3.5 bg-secondary text-on-secondary rounded-xl font-bold hover:brightness-105 active:scale-[0.98] transition-all shadow-sm"
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        /* ── Form ── */
                        <>
                            <div className="text-center mb-8">
                                <h1 className="font-headline-lg text-headline-lg text-on-surface mb-3 font-bold">Forgot Merchant Password?</h1>
                                <p className="font-body-md text-body-md text-on-surface-variant max-w-[320px] mx-auto leading-relaxed">
                                    Enter your registered merchant email address. We'll send a secure link to reset your password.
                                </p>
                            </div>

                            {errorMsg && (
                                <div className="w-full p-3 mb-4 bg-error-container text-on-error-container rounded-xl text-sm font-semibold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">error</span>{errorMsg}
                                </div>
                            )}

                            <form className="w-full space-y-6">
                                <div className="space-y-2">
                                    <label className="font-label-md text-label-md text-on-surface-variant ml-1 font-semibold" htmlFor="email">
                                        Business Email
                                    </label>
                                    <div className="relative">
                                        <Email className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/60" />
                                        <input
                                            type="email"
                                            id="email"
                                            placeholder="partner@paws.com"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
                                            className="w-full h-14 pl-12 pr-4 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-secondary focus:bg-surface-container-lowest transition-all duration-200 font-body-md text-body-md placeholder:text-on-surface-variant/40 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={sendMail}
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-14 bg-primary text-on-primary font-headline-md font-bold rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70"
                                >
                                    {loading ? (
                                        <><span className="material-symbols-outlined animate-spin">progress_activity</span> Sending...</>
                                    ) : (
                                        <><span>Send Recovery Link</span><ArrowForward className="material-symbols-outlined group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </button>
                            </form>

                            <div className="mt-8">
                                <button

                                    className="font-label-md text-label-md text-secondary hover:text-secondary-container transition-colors flex items-center gap-1 group font-semibold"
                                >
                                    <ChevronLeft className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform" />
                                    Back to Merchant Login
                                </button>
                            </div>

                            <div className="mt-8 p-4 bg-tertiary/10 border-l-4 border-tertiary rounded-r-lg w-full">
                                <div className="flex gap-3">
                                    <VerifiedUser className="material-symbols-outlined text-tertiary" />
                                    <p className="font-body-sm text-body-sm text-on-tertiary-fixed-variant leading-relaxed font-semibold">
                                        All recovery links are verified using secure tokens. Your partner account data is safely encrypted.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            <footer className="bg-surface-container w-full mt-auto">
                <div className="w-full py-12 px-6 md:px-10 max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-body-sm text-on-surface-variant select-none">
                    <div className="font-bold text-primary">Pawfect Pals Partner Console</div>
                    <div className="flex gap-6">
                        <a className="hover:text-primary transition-colors" href="#" onClick={e => e.preventDefault()}>Privacy Guide</a>
                        <a className="hover:text-primary transition-colors" href="#" onClick={e => e.preventDefault()}>Terms of Use</a>
                        <a className="hover:text-primary transition-colors" href="#" onClick={e => e.preventDefault()}>Helpdesk</a>
                    </div>
                    <div className="font-semibold text-secondary">© 2024 Pawfect Pals. All rights reserved.</div>
                </div>
            </footer>
        </div>
    )
}
