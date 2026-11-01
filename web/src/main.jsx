import { createRoot } from "react-dom/client";
import MyArea from "./ArchanaArea/components/MyArea";

createRoot(document.getElementById("root")).render(<MyArea />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
    });
  });
}
