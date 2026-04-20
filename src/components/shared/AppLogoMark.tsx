import Image from "next/image";

type AppLogoMarkProps = {
  className?: string;
};

/** Radiant Rabbits mark beside SprintHub in SideNav and landing header. */
export default function AppLogoMark({
  className = "h-16 w-16",
}: AppLogoMarkProps) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl bg-brand-dark ${className}`}
      aria-hidden
    >
      <Image
        src="/logo-options/radiant-rabbits-mark.png"
        alt=""
        fill
        className="object-cover"
        sizes="64px"
      />
    </div>
  );
}
