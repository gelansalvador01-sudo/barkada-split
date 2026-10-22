import type { ReactNode } from "react";

function StrokeIcon({
  className = "size-5",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className ?? "size-4"}>
      <path d="M3.75 13.5 14.25 2.25 12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

export function BellIcon({
  className,
  wiggle,
}: {
  className?: string;
  wiggle?: boolean;
}) {
  return (
    <StrokeIcon className={`${className ?? "size-5"} ${wiggle ? "animate-wiggle" : ""}`}>
      <path d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </StrokeIcon>
  );
}

export function HomeIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="M2.25 12 11.204 3.045c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </StrokeIcon>
  );
}

export function UsersIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </StrokeIcon>
  );
}

export function ClockIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </StrokeIcon>
  );
}

export function UserIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </StrokeIcon>
  );
}

export function PlusIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="M12 4.5v15m7.5-7.5h-15" />
    </StrokeIcon>
  );
}

export function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </StrokeIcon>
  );
}

export function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="M15.75 19.5 8.25 12l7.5-7.5" />
    </StrokeIcon>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="m4.5 12.75 6 6 9-13.5" />
    </StrokeIcon>
  );
}

export function ReceiptIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="M9 12h6M9 15.75h6M9 8.25h6M6.75 3h10.5A1.75 1.75 0 0 1 21 4.75v14.5a1.75 1.75 0 0 1-1.75 1.75H6.75A1.75 1.75 0 0 1 5 19.25V4.75A1.75 1.75 0 0 1 6.75 3Z" />
    </StrokeIcon>
  );
}

export function XIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="M6 18 18 6M6 6l12 12" />
    </StrokeIcon>
  );
}

export function CameraIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
    </StrokeIcon>
  );
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </StrokeIcon>
  );
}

export function WalletIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="M21 7.125v10.5A2.625 2.625 0 0 1 18.375 20.25H5.25a2.25 2.25 0 0 1-2.25-2.25V5.625A2.25 2.25 0 0 1 5.25 3.375h11.813A1.875 1.875 0 0 1 18.938 5.25v1.875H6.75a.75.75 0 0 0 0 1.5h13.5a.75.75 0 0 1 .75.75Z" />
      <path d="M15.75 12.75h.008v.008h-.008v-.008Z" />
    </StrokeIcon>
  );
}

export function EyeIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </StrokeIcon>
  );
}

export function EyeOffIcon({ className }: { className?: string }) {
  return (
    <StrokeIcon className={className}>
      <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </StrokeIcon>
  );
}
