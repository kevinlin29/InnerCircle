import AppShell from "@/components/AppShell";
import StoreProvider from "@/store/StoreProvider";
import OnlineStatusProvider from "@/components/OnlineStatusProvider";
import { ToastProvider } from "@/components/ui/toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <OnlineStatusProvider>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </OnlineStatusProvider>
    </StoreProvider>
  );
}
