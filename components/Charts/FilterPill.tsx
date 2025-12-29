const FilterPill = ({ active, label, icon: Icon, onClick }: any) => (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
        active 
        ? 'bg-white text-black border-white' 
        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
);

export default FilterPill