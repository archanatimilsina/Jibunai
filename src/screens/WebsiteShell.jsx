import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";

const DEFAULT_APP_URL = "";

const CONFIGURED_URL = (process.env.EXPO_PUBLIC_APP_URL || DEFAULT_APP_URL || "")
  .trim()
  .replace(/\/+$/, "");

const normalize = (url) => (url || "").trim().replace(/\/+$/, "");

const COLORS = {
  bg: "#f6f5f0",
  dark: "#1a1a2e",
  green: "#2d6a4f",
  soft: "#7a7567",
  border: "#d8d4cc",
};

function getOrigin(url) {
  const match = /^(https?:\/\/[^/]+)/i.exec(url || "");
  return match ? match[1].toLowerCase() : null;
}

export default function WebsiteShell() {
  const webRef = useRef(null);
  const canGoBack = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manualUrl, setManualUrl] = useState("");
  const [committedUrl, setCommittedUrl] = useState("");

  const activeUrl = CONFIGURED_URL || committedUrl;

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack.current && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    webRef.current?.reload();
  }, []);

  const onShouldStartLoadWithRequest = useCallback(
    (request) => {
      const { url } = request;
      if (!url || url === "about:blank") return true;
      if (!/^https?:/i.test(url)) return true;

      if (getOrigin(url) === getOrigin(activeUrl)) return true;

      Linking.openURL(url).catch(() => {});
      return false;
    },
    [activeUrl]
  );

  if (!activeUrl) {
    return (
      <View style={styles.setupWrap}>
        <StatusBar style="dark" />
        <View style={styles.dot} />
        <Text style={styles.setupTitle}>Archana's Secret Space</Text>
        <Text style={styles.setupText}>
          Paste the URL where the ArchanaArea web build is hosted, then tap Open.
        </Text>
        <TextInput
          style={styles.input}
          value={manualUrl}
          onChangeText={setManualUrl}
          placeholder="https://your-app-url"
          placeholderTextColor={COLORS.soft}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
        />
        <Pressable
          style={({ pressed }) => [
            styles.retryBtn,
            !manualUrl.trim() && styles.retryBtnDisabled,
            pressed && styles.retryBtnPressed,
          ]}
          disabled={!manualUrl.trim()}
          onPress={() => {
            setError(null);
            setLoading(true);
            setCommittedUrl(normalize(manualUrl));
          }}
        >
          <Text style={styles.retryText}>Open</Text>
        </Pressable>
        <Text style={styles.setupHint}>
          For a permanent setup, set{"\n"}
          <Text style={styles.codeInline}>EXPO_PUBLIC_APP_URL</Text> in{" "}
          <Text style={styles.codeInline}>mobile/.env</Text>. Build the web app with{" "}
          <Text style={styles.codeInline}>npm run build:web</Text> and deploy{" "}
          <Text style={styles.codeInline}>mobile/web/dist</Text>.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        ref={webRef}
        source={{ uri: activeUrl }}
        style={styles.webview}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        contentInsetAdjustmentBehavior="automatic"
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        onNavigationStateChange={(nav) => {
          canGoBack.current = nav.canGoBack;
        }}
        onLoadStart={() => {
          setError(null);
          setLoading(true);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={(e) => {
          setLoading(false);
          setError(e?.nativeEvent?.description || "Could not load the app.");
        }}
        onHttpError={(e) => {
          setLoading(false);
          setError(`Server responded with ${e?.nativeEvent?.statusCode}.`);
        }}
      />

      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={styles.loadingLabel}>Loading your space…</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Couldn't load the app</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
            onPress={reload}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(activeUrl).catch(() => {})}>
            <Text style={styles.openText}>Open in browser</Text>
          </Pressable>
          {!CONFIGURED_URL && (
            <Pressable
              onPress={() => {
                setCommittedUrl("");
                setManualUrl("");
                setError(null);
              }}
            >
              <Text style={styles.openText}>Change URL</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  webview: { flex: 1, backgroundColor: COLORS.bg },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: COLORS.bg,
  },
  loadingLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: COLORS.soft,
  },

  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
    backgroundColor: COLORS.bg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.dark,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: COLORS.soft,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: COLORS.dark,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 100,
  },
  retryBtnDisabled: { opacity: 0.35 },
  retryBtnPressed: { opacity: 0.8 },
  retryText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  openText: {
    marginTop: 6,
    color: COLORS.green,
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  setupWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: COLORS.bg,
    gap: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.green,
    marginBottom: 6,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.dark,
    textAlign: "center",
  },
  setupText: {
    fontSize: 14,
    color: COLORS.soft,
    textAlign: "center",
    lineHeight: 21,
  },
  input: {
    marginTop: 10,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: COLORS.dark,
  },
  setupHint: {
    marginTop: 8,
    fontSize: 12.5,
    color: COLORS.soft,
    textAlign: "center",
    lineHeight: 20,
  },
  codeInline: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 12,
    color: COLORS.dark,
  },
});
