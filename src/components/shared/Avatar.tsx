import Image from "next/image";
import { getAvatarColorCssVar } from "@/lib/colourPalette";

type AvatarProps = {
  name: string;
  initials: string;
  avatarUrl: string | null;
  size: number;
  className?: string;
};

export default function Avatar({
  name,
  initials,
  avatarUrl,
  size,
  className = "",
}: AvatarProps) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        title={name}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        // GitHub avatar URLs already include size hints and redirect behavior;
        // bypass optimization so external profile images render reliably.
        unoptimized
      />
    );
  }

  const bgColor = getAvatarColorCssVar(name);

  return (
    <span
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
      }}
      title={name}
      aria-label={name}
      role="img"
      className={`flex shrink-0 items-center justify-center rounded-full text-(length:--text-body-xs) font-bold text-brand-surface ${className}`}
    >
      <span aria-hidden="true">{initials}</span>
    </span>
  );
}
