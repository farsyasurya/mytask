import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import ReminderModal from "@/components/notification/ReminderModal";

export const metadata = {
  title: "MyTask - Manajemen Tugas Kuliah",
  description: "Aplikasi manajemen tugas kuliah pribadi dengan sistem notifikasi internal",
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



