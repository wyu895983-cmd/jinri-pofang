export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" fill="none" aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#09090B" />
      <path
        d="M104 159C104 119.236 136.236 87 176 87H336C375.764 87 408 119.236 408 159V271C408 310.764 375.764 343 336 343H276L211.4 416.06C198.622 430.51 175 421.474 175 402.179V343C135.236 343 104 310.764 104 271V159Z"
        fill="#B6FF3B"
      />
      <path d="M253 116L230 188H268L242 283" stroke="#09090B" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M281 130L258 206H300L269 310" stroke="#7C3AED" strokeWidth="21" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="342" cy="131" r="10" fill="#7C3AED" />
      <circle cx="365" cy="162" r="7" fill="#7C3AED" />
    </svg>
  );
}
