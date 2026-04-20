type PageContainerProps = {
  children: React.ReactNode;
};

export default function PageContainer({ children }: PageContainerProps) {
  return (
    <main className="mx-auto w-full max-w-container px-xl py-xl">
      {children}
    </main>
  );
}
