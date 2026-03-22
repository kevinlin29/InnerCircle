import AppShell from "@/components/AppShell";
import StoreProvider from "@/store/StoreProvider";
import OnlineStatusProvider from "@/components/OnlineStatusProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <OnlineStatusProvider>
        <AppShell>{children}</AppShell>
      </OnlineStatusProvider>
    </StoreProvider>
  );
}
