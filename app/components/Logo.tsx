export default function Logo({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <img 
      src="/logo.png" 
      alt="Ragasiapp Logo" 
      className={className}
    />
  );
}
