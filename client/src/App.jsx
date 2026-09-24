import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/authContext";
import { RouterFlagProvider } from "@/context/routerFlagProvider";
import { ScrollToTop } from "@/features/ScrollToTop";
import { useEffect } from "react";

import Router from "./router";
import DemoFloatingBadge from "./components/DemoFloatingBadge";

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <RouterFlagProvider>
          <ScrollToTop />
          <Router />
          <DemoFloatingBadge />
        </RouterFlagProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
