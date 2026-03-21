import AppShell from "@/components/AppShell";
import StoreProvider from "@/store/StoreProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
