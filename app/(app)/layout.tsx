import PresenceBar from "@/app/components/PresenceBar";
import PushRegister from "@/app/components/PushRegister";
import Nav from "@/app/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-slate-50">
      <PushRegister />
      <PresenceBar />
      <Nav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
