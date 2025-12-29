
const StatPill = ({ label, value, icon: Icon, color }: any) => {
  const colorClasses = {
    sky: 'bg-sky-600/20 text-white',
    purple: 'bg-purple-600/20 text-white',
    blue: 'bg-blue-600/20 text-white',
    green: 'bg-green-600/20 text-white',
    red: 'bg-red-600/20 text-white',
  };
  const bgClass = colorClasses[color as keyof typeof colorClasses] || 'bg-sky-600/20 text-white';
  
  return (
    <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 flex items-center gap-3">
      <div className={`p-2 rounded-full ${bgClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xl font-black text-white">{value}</div>
        <div className="text-xs uppercase tracking-widest text-zinc-500">
          {label}
        </div>
      </div>
    </div>
  );
};

export default StatPill