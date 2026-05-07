type PageContainerProps = {
  children: React.ReactNode;
};

export default function PageContainer({ children }: PageContainerProps) {
  return (
    <main className="lg:mt-7 lg:mx-6 lg:mb-7 mt-6 mx-5 mb-6">{children}</main>
  );
}
