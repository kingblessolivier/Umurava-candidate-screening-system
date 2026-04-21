"use client";
import { Provider } from "react-redux";
import { store }    from "@/store";
import { Toaster }  from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0d1220",
            color: "#f1f5f9",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            fontSize: "13px",
          },
          success: { iconTheme: { primary: "#22c55e", secondary: "#0d1220" } },
          error:   { iconTheme: { primary: "#ef4444", secondary: "#0d1220" } },
        }}
      />
    </Provider>
  );
}
