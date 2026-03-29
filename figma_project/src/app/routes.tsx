import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout";
import SplashScreen from "./components/SplashScreen";
import GraphsPage from "./components/GraphsPage";
import SettingsPage from "./components/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <SplashScreen />,
      },
      {
        path: "graphs",
        element: <GraphsPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
]);