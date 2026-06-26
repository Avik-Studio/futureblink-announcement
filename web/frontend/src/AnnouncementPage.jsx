import { useCallback, useEffect, useState } from "react";
import { authFetch } from "./useAuthFetch.js";
import {
  Page,
  Layout,
  Card,
  TextField,
  Button,
  Banner,
  BlockStack,
  InlineStack,
  Text,
  Box,
  Spinner,
} from "@shopify/polaris";

export default function AnnouncementPage() {
  const [text, setText] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [feedback, setFeedback] = useState(null); // { tone, message }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/announcement");
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${body ? ": " + body.slice(0, 120) : ""}`);
      }
      const data = await res.json();
      setText(data.announcement || "");
      setHistory(data.history || []);
    } catch (err) {
      setFeedback({
        tone: "critical",
        message: `Couldn't load the current announcement. ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await authFetch("/api/announcement", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }
      setFeedback({
        tone: "success",
        message: "Saved! Your announcement is now live on your storefront.",
      });
      load();
    } catch (err) {
      setFeedback({ tone: "critical", message: err.message });
    } finally {
      setSaving(false);
    }
  }, [text, load]);

  const deleteRecord = useCallback(async (id) => {
    setDeletingId(id);
    try {
      const res = await authFetch(`/api/announcement/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Delete failed");
      }
      setHistory((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setFeedback({ tone: "critical", message: err.message });
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <Page title="Announcement Banner">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {feedback && (
              <Banner
                tone={feedback.tone}
                onDismiss={() => setFeedback(null)}
              >
                {feedback.message}
              </Banner>
            )}

            <Card>
              {loading ? (
                <Box padding="400">
                  <Spinner accessibilityLabel="Loading" size="small" />
                </Box>
              ) : (
                <BlockStack gap="400">
                  <Text as="p" tone="subdued">
                    Type your announcement below and click Save. It will
                    instantly appear as a banner on every page of your
                    storefront.
                  </Text>

                  <TextField
                    label="Announcement Text"
                    value={text}
                    onChange={setText}
                    autoComplete="off"
                    placeholder="e.g. Sale 50% Off"
                    maxLength={255}
                    showCharacterCount
                  />

                  <Button
                    variant="primary"
                    loading={saving}
                    disabled={loading}
                    onClick={save}
                  >
                    Save
                  </Button>
                </BlockStack>
              )}
            </Card>

            {history.length > 0 && (
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingSm">
                    Recent history
                  </Text>
                  <BlockStack gap="200">
                    {history.map((item) => (
                      <InlineStack key={item._id} align="space-between" blockAlign="center">
                        <Text as="span">
                          {item.text || "(empty)"}{" "}
                          <Text as="span" tone="subdued">
                            — {new Date(item.createdAt).toLocaleString()}
                          </Text>
                        </Text>
                        <Button
                          tone="critical"
                          size="slim"
                          loading={deletingId === item._id}
                          onClick={() => deleteRecord(item._id)}
                        >
                          Delete
                        </Button>
                      </InlineStack>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
