const VoteTooltip = ({ side, label, icon: Icon }: any) => (
    <div className={`absolute top-1/2 -translate-y-1/2 ${side === 'left' ? 'left-8' : 'right-8'} hidden md:flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}>
      <div className="bg-black/50 backdrop-blur-md border border-white/10 p-3 rounded-2xl">
        <Icon className={`w-8 h-8 ${side === 'left' ? 'text-red-500' : 'text-green-500'}`} />
      </div>
      <div className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-mono text-zinc-400 border border-white/5">
        {side === 'left' ? '← Left Arrow' : 'Right Arrow →'}
      </div>
    </div>
);

export default VoteTooltip