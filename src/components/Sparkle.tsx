interface SparkleProps {
  className?: string;
  size?: number;
  delay?: number;
}

const Sparkle = ({ className = "", size = 24, delay = 0 }: SparkleProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={`sparkle ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <path
        d="M12 0L13.4 8.6L22 10L13.4 11.4L12 20L10.6 11.4L2 10L10.6 8.6L12 0Z"
        fill="hsl(var(--solana-yellow))"
      />
    </svg>
  );
};

export default Sparkle;
