const Visualizer = ({ isPlaying }: { isPlaying: boolean }) => (
    <div className="flex items-end justify-center gap-1 h-12 w-full opacity-60">
      {[...Array(30)].map((_, i) => (
        <div 
          key={i} 
          className="w-1.5 bg-white rounded-t-full transition-all duration-75"
          style={{ 
            height: isPlaying ? `${Math.max(10, Math.random() * 100)}%` : '10%',
            animation: isPlaying ? `bounce ${0.4 + Math.random() * 0.5}s infinite alternate` : 'none',
            animationDelay: `-${Math.random()}s`
          }} 
        />
      ))}
      <style jsx>{`
        @keyframes bounce {
          0% { height: 10%; }
          100% { height: 100%; }
        }
      `}</style>
    </div>
);

export default Visualizer