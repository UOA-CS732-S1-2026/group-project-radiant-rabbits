type PageContainerProps = {
  children: React.ReactNode;
};

export default function PageContainer({ children }: PageContainerProps) {
  return <main className="p-lg lg:p-xl">{children}</main>;
}
