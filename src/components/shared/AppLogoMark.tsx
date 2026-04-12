type AppLogoMarkProps = {
  className?: string;
};

/** Rounded square used beside SprintHub in SideNav and landing header. */
export default function AppLogoMark({
  className = "h-16 w-16",
}: AppLogoMarkProps) {
  return (
    <div
      className={`shrink-0 rounded-xl bg-brand-accent/30 ${className}`}
      aria-hidden
    />
  );
}
