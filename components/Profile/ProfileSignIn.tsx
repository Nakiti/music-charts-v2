import Link from "next/link"
import { User, ArrowRight } from "lucide-react"

const ProfileSignIn = () => {

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-sky-500/30 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-white/10 to-sky-600/20 blur-[120px] rounded-full pointer-events-none" />
                <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-white to-sky-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mb-2">Sign In Required</h1>
                    <p className="text-zinc-400 text-sm">Create an account or sign in to view profiles and start voting on tracks. </p>
                </div>
                <div className="space-y-3">
                    <Link
                        href="/login"
                        className="w-full bg-white text-black py-3.5 rounded-xl font-bold hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        Sign In <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                        href="/register"
                        className="w-full bg-gradient-to-r from-white to-sky-500 hover:from-white hover:to-sky-400 text-black py-3.5 rounded-xl font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-900/20"
                    >
                        Create Account <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default ProfileSignIn