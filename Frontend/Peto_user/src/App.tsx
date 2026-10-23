import AppRoutes from "./routes/AppRoutes";
import AndroidAppBanner from "./components/common/AndroidAppBanner";
import CookieConsentBanner from "./components/common/CookieConsentBanner";

import { PetUploadQueue } from "./components/pets/PetUploadQueue";

function App() {
  return (
    <>
      <AndroidAppBanner />
      <AppRoutes />
      <PetUploadQueue />
      <CookieConsentBanner />
    </>
  );
}

export default App;