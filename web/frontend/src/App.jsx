import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";

import AnnouncementPage from "./AnnouncementPage.jsx";

export default function App() {
  return (
    <AppProvider i18n={enTranslations}>
      <AnnouncementPage />
    </AppProvider>
  );
}
