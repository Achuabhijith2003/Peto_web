import AppRoutes from "./routes/AppRoutes";
import AndroidAppBanner from "./components/common/AndroidAppBanner";
import CookieConsentBanner from "./components/common/CookieConsentBanner";

function App() {
  return (
    <>
      <AndroidAppBanner />
      <AppRoutes />
      <CookieConsentBanner />
    </>
  );
}

export default App;