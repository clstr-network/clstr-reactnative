import { cn } from "@/lib/utils";

interface BlobButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const BlobButton = ({ children, className, onClick }: BlobButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative font-inherit text-lg rounded-[40em] w-[14em] h-[3em] z-[1] text-white cursor-pointer overflow-hidden border-none group",
        className
      )}
    >
      <span className="absolute inset-0 rounded-[40em] border-none bg-gradient-to-b from-white/50 to-gray-400/25 z-[1] backdrop-blur-[10px]" />
      <span className="relative z-[2] font-semibold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-white">
        {children}
      </span>
      <span className="absolute z-[-1] rounded-[5em] w-[5em] h-[3em] transition-all duration-300 ease-in-out left-0 top-0 bg-[#ff930f] group-hover:bg-[#0061ff] group-hover:scale-[1.3]" />
      <span className="absolute z-[-1] rounded-[5em] w-[5em] h-[3em] transition-all duration-300 ease-in-out left-[3em] top-0 bg-[#bf0fff] group-hover:bg-[#ff1b6b] group-hover:scale-[1.3]" />
      <span className="absolute z-[-1] rounded-[5em] w-[5em] h-[3em] transition-all duration-300 ease-in-out left-[6em] top-[-1em] bg-[#ff1b6b] group-hover:bg-[#bf0fff] group-hover:scale-[1.3]" />
      <span className="absolute z-[-1] rounded-[5em] w-[5em] h-[3em] transition-all duration-300 ease-in-out left-[9em] top-0 bg-[#0061ff] group-hover:bg-[#ff930f] group-hover:scale-[1.3]" />
      <span className="absolute z-[-1] rounded-[5em] w-[5em] h-[3em] transition-all duration-300 ease-in-out left-[10em] top-[1.6em] bg-[#00bcd4] group-hover:bg-[#ff930f] group-hover:scale-[1.3]" />
    </button>
  );
};

export default BlobButton;
