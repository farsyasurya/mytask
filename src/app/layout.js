import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import ReminderModal from "@/components/notification/ReminderModal";

export const metadata = {
  title: "MyTask - Manajemen Tugas Kuliah",
  description: "Aplikasi manajemen tugas kuliah pribadi dengan notifikasi Telegram",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MyTask",
  },
};

export const viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased min-h-screen">
        <AuthProvider>
          <ReminderModal />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}



