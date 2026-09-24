import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/authContext";
import { RouterFlagProvider } from "@/context/routerFlagProvider";
import { ScrollToTop } from "@/features/ScrollToTop";
import { useEffect } from "react";
import { MantineProvider } from "@mantine/core";

import Router from "./router";
import DemoFloatingBadge from "./components/DemoFloatingBadge";

function App() {
  // Enforce 10px base font size across all browsers and environments
  useEffect(() => {
    document.documentElement.style.fontSize = "10px";
  }, []);

  return (
    <MantineProvider>
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
    </MantineProvider>
  );
}

export default App;
