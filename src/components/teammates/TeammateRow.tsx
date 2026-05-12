import Avatar from "@/components/shared/Avatar";
import { getInitials } from "@/lib/formatters";

export type TeammateRowData = {
  id: string;
  name: string;
  login: string | null;
  email: string | null;
  avatarUrl: string | null;
};

type TeammateRowProps = {
  person: TeammateRowData;
  isFirst: boolean;
};

export default function TeammateRow({ person, isFirst }: TeammateRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-md px-lg py-sm ${
        isFirst ? "" : "border-t border-brand-dark/10 pt-md"
      }`}
    >
      <div className="flex flex-1 items-center gap-md min-w-0">
        <Avatar
          name={person.name}
          initials={getInitials(person.name)}
          avatarUrl={person.avatarUrl}
          size={40}
        />
        <div className="min-w-0">
          <p className="text-(length:--text-body-lg) font-semibold text-brand-dark">
            {person.name}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-(length:--text-body-sm) text-brand-dark/70">
          {person.email ?? "—"}
        </p>
      </div>
    </div>
  );
}
