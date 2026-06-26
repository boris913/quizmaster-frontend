import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 40 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={cn(className)}
      width={size}
      height={size}
      aria-label="QuizMaster"
    >
      <rect width="100" height="100" rx="20" fill="#1a1a1a" />
      <text x="50" y="72" fontFamily="Arial, sans-serif" fontSize="70" fontWeight="bold" fill="#ffffff" textAnchor="middle">
        Q
      </text>
      <circle cx="50" cy="50" r="40" stroke="#f5a623" strokeWidth="4" fill="none" />
    </svg>
  );
}