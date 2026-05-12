import Image from "next/image";
import { getAvatarColorCssVar } from "@/lib/colourPalette";

type AvatarProps = {
  name: string;
  initials: string;
  avatarUrl: string | null;
  size: number;
  className?: string;
};

// Displays a circular image if the user's github profile is available
// Otherwise displays a coloured circle with the user's initials
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
      className={`flex shrink-0 items-center justify-center rounded-full text-(length:--text-body-xs) font-bold text-brand-surface ${className}`}
    >
      {initials}
    </span>
  );
}
