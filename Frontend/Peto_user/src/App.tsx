import AppRoutes from "./routes/AppRoutes";
import AndroidAppBanner from "./components/common/AndroidAppBanner";

function App() {
  return (
    <>
      <AndroidAppBanner />
      <AppRoutes />
    </>
  );
}

export default App;