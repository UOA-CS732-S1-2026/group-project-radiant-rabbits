import Image from "next/image";

type AppLogoMarkProps = {
  className?: string;
};

/** Radiant Rabbits mark for the marketing header and (via SideNav) the app shell. */
export default function AppLogoMark({
  className = "h-16 w-16",
}: AppLogoMarkProps) {
  return (
    <div className={`relative shrink-0 bg-brand-dark ${className}`} aria-hidden>
      <Image
        src="/logo-options/final_logo.png"
        alt=""
        fill
        className="object-cover"
        sizes="64px"
        unoptimized
      />
    </div>
  );
}
