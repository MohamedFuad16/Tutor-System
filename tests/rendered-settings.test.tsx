import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsButton } from "../src/components/SettingsModal";
import { useStore } from "../src/store";

let fetchMock: ReturnType<typeof vi.fn>;

const resetSettingsStore = () => {
  localStorage.clear();
  useStore.setState({
    accessMode: "user",
    activeView: "study",
    planTier: "free",
    apiKey: "",
    serperApiKey: "",
    deepgramApiKey: "",
    learnerName: "Learner",
    ttsVoice: "aura-asteria-en",
    misoTtsApiUrl: "http://127.0.0.1:8080",
    aiModel: "deepseek/deepseek-v4-flash",
    animationsEnabled: true,
    systemPrompt: "",
    language: "en",
    chatUsage: {
      provider: "openrouter",
      model: "deepseek/deepseek-v4-flash",
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      estimated: false,
      requests: 0,
    },
    voiceUsage: {
      provider: "deepgram",
      voiceAgentModel: "Deepgram Voice Agent",
      ttsModel: "aura-asteria-en",
      listenModel: "flux-general-en",
      speakModel: "aura-asteria-en",
      connectionSeconds: 0,
      inputAudioSeconds: 0,
      outputAudioSeconds: 0,
      ttsCharacters: 0,
      cost: 0,
      estimated: false,
      sessions: 0,
    },
    webUsage: {
      provider: "serper",
      requests: 0,
      searchRequests: 0,
      newsRequests: 0,
      sourcesReviewed: 0,
      failures: 0,
      cost: 0,
      estimated: true,
    },
    totalTokens: 0,
    estimatedCost: 0,
  });
};

const openSettings = async () => {
  const user = userEvent.setup();
  render(<SettingsButton />);
  await user.click(screen.getByRole("button", { name: "App Settings" }));
  return user;
};

beforeEach(() => {
  resetSettingsStore();
  fetchMock = vi.fn(async () => {
    throw new Error("Unexpected provider validation request in SettingsModal");
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rendered SettingsModal", () => {
  it("opens and closes from the close button and Cancel action", async () => {
    const user = userEvent.setup();
    render(<SettingsButton />);

    await user.click(screen.getByRole("button", { name: "App Settings" }));
    expect(
      screen.getByRole("heading", { name: "App Settings" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close settings" }));
    expect(screen.queryByRole("heading", { name: "App Settings" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "App Settings" }));
    expect(
      screen.getByRole("heading", { name: "App Settings" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "App Settings" })).toBeNull();
  });

  it("switches between General, Usage, and Persona tabs", async () => {
    const user = await openSettings();

    expect(screen.getByLabelText("App Language")).toBeInTheDocument();
    expect(screen.getByLabelText("Learner Name")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Usage" }));
    expect(screen.getByText("Plan and milestones")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Plus.*daily requests/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Persona Studio" }));
    expect(screen.getByText("AI Persona Studio")).toBeInTheDocument();
    expect(screen.getByText("Live prompt")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Socratic Python mentor" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "General" }));
    expect(screen.getByLabelText("App Language")).toBeInTheDocument();
  });

  it("hides admin provider controls in user mode", async () => {
    await openSettings();

    expect(screen.getByText(/Free allowance/i)).toBeInTheDocument();
    expect(screen.queryByText("OpenRouter API Key")).toBeNull();
    expect(screen.queryByText("Serper API Key")).toBeNull();
    expect(screen.queryByText("Deepgram API Key")).toBeNull();
    expect(screen.queryByText("TTS Voice Selection")).toBeNull();
    expect(screen.queryByText("MisoTTS API URL")).toBeNull();
    expect(screen.queryByText("AI Model")).toBeNull();
  });

  it("exposes provider controls in admin mode", async () => {
    useStore.setState({ accessMode: "admin" });

    await openSettings();

    expect(screen.getByText("OpenRouter API Key")).toBeInTheDocument();
    expect(screen.getByText("Serper API Key")).toBeInTheDocument();
    expect(screen.getByText("Deepgram API Key")).toBeInTheDocument();
    expect(screen.getByText("TTS Voice Selection")).toBeInTheDocument();
    expect(screen.getByText("MisoTTS API URL")).toBeInTheDocument();
    expect(screen.getByText("AI Model")).toBeInTheDocument();
  });

  it("saves user-mode language, learner name, and animation preference without provider validation", async () => {
    const user = await openSettings();

    await user.selectOptions(screen.getByLabelText("App Language"), "ko");
    await user.clear(screen.getByLabelText("Learner Name"));
    await user.type(screen.getByLabelText("Learner Name"), "Ada Lovelace");

    const animationToggle = screen.getByRole("button", {
      name: "Toggle animations",
    });
    expect(animationToggle).toHaveAttribute("aria-pressed", "true");
    await user.click(animationToggle);
    expect(animationToggle).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(useStore.getState().language).toBe("ko");
    expect(useStore.getState().learnerName).toBe("Ada Lovelace");
    expect(useStore.getState().animationsEnabled).toBe(false);
    expect(localStorage.getItem("learning_ai_language")).toBe("ko");
    expect(localStorage.getItem("learner_name")).toBe("Ada Lovelace");
    expect(localStorage.getItem("animations_enabled")).toBe("false");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "App Settings" })).toBeNull();
  });

  it("keeps the admin modal open when provider validation fails", async () => {
    useStore.setState({ accessMode: "admin" });
    fetchMock.mockResolvedValueOnce({ ok: false });
    const user = await openSettings();

    await user.type(
      screen.getByPlaceholderText("sk-or-v1-..."),
      "sk-or-v1-invalid",
    );
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(
      await screen.findByText("Invalid API Key or OpenRouter is unreachable."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "App Settings" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/models",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-or-v1-invalid",
        }),
      }),
    );
    expect(useStore.getState().apiKey).toBe("");
  });
});
