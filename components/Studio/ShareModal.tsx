import { useState } from "react";
import { CheckCircle2, X, Copy, Share2, Twitter } from "lucide-react";
import { trackNameToSlug } from "@/lib/slug";

interface ShareModalProps {
  trackId: string;
  trackTitle: string;
  uploaderUsername: string;
  trackSlug?: string; // Optional slug field
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  trackId,
  trackTitle,
  uploaderUsername,
  trackSlug,
  onClose,
}) => {
    const [copied, setCopied] = useState(false);
    
    // Construct the unique track URL: /track/[username]/[trackSlug]
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://chartbreaker.com';
    const usernameSlug = encodeURIComponent(uploaderUsername || 'unknown-user');
    // Use slug if available, otherwise generate from title
    const titleSlug = trackSlug || trackNameToSlug(trackTitle || 'track');
    const shareUrl = `${origin}/track/${usernameSlug}/${titleSlug}`;
    
    const copyLink = () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        } else {
            console.log("Clipboard API not available. Link copied to console.");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareViaWebAPI = () => {
      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({
          title: `🔥 I just launched '${trackTitle}' on ChartBreaker! Vote now!`,
          url: shareUrl,
        });
      } else {
        copyLink();
      }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-sky-500/50 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in duration-300">
                
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-3xl font-black text-white">Track Launched!</h2>
                    <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <div className="text-center mb-8">
                    <p className="text-xl text-green-400 font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-6 h-6 fill-green-400 text-black" />
                        '{trackTitle}' is now in the Arena!
                    </p>
                    <p className="text-zinc-400 mt-2">Share this link to get your first votes and hit the charts.</p>
                </div>

                {/* Share Link Bar */}
                <div className="bg-zinc-950 border border-white/10 rounded-xl p-3 flex items-center mb-6">
                    <span className="text-sm text-zinc-400 font-mono truncate flex-1">{shareUrl}</span>
                    <button 
                        onClick={copyLink}
                        className={`ml-3 px-4 py-2 rounded-lg text-sm font-bold transition-all ${copied ? 'bg-green-600 text-white' : 'bg-gradient-to-r from-white to-sky-500 hover:from-white hover:to-sky-400 text-black'}`}
                    >
                        {copied ? (
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Copied!</span>
                        ) : (
                            <span className="flex items-center gap-1"><Copy className="w-4 h-4" /> Copy Link</span>
                        )}
                    </button>
                </div>

                {/* Social Share Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={shareViaWebAPI}
                        className="py-3 rounded-xl bg-gradient-to-r from-white to-sky-500 hover:from-white hover:to-sky-400 text-black font-bold flex items-center justify-center gap-2"
                    >
                        <Share2 className="w-5 h-5" /> Share (Mobile)
                    </button>
                    <a 
                        href={`https://twitter.com/intent/tweet?text=🔥 My new track '${trackTitle}' is live on ChartBreaker! Vote now to help me hit the charts! ${shareUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-3 rounded-xl bg-black border border-white/10 hover:bg-zinc-800 text-white font-bold flex items-center justify-center gap-2"
                    >
                        <Twitter className="w-5 h-5" /> Share on X
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ShareModal