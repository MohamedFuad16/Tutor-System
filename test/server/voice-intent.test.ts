import { describe, expect, it } from "vitest";
import { detectImageIntent, offeredSubject } from "../../server/voice/intent";

describe("detectImageIntent", () => {
  it.each([
    ["Show me an image of Nikola Tesla", "Nikola Tesla"],
    ["Pull up Tokyo", "Tokyo"],
    ["pull up Tokyo.", "Tokyo"],
    ["Okay, can you pull up the Eiffel Tower for me?", "Eiffel Tower"],
    ["Show me Mount Fuji", "Mount Fuji"],
    ["Let me see the Great Wall of China", "Great Wall China"],
    ["Can I see a photo of a red panda?", "red panda"],
    ["any pictures of the Colosseum", "Colosseum"],
    ["What does a mitochondrion look like?", "mitochondrion"],
    ["show me what a neuron looks like", "neuron"],
    ["Yes, bring up Kyoto", "Kyoto"],
    ["東京の写真を見せて", "東京"],
  ])("%s → %s", (utterance, expected) => {
    expect(detectImageIntent(utterance)).toBe(expected);
  });

  it.each([
    "Show me how photosynthesis works",
    "show me the answer",
    "Show me an example",
    "show me the steps again",
    "Can you draw a diagram of the Krebs cycle?",
    "Explain the second law of thermodynamics",
    "See you later",
    "I don't want pictures right now",
    "No thanks, no images",
    "Show me figure 3",
    "What is a neuron?",
    "Yes please",
    "show me something",
  ])("ignores %s", (utterance) => {
    expect(detectImageIntent(utterance)).toBeNull();
  });

  it("acts on a yes to the tutor's own offer", () => {
    const offer = "I can't show that, but I can pull up Tokyo if you want.";
    expect(detectImageIntent("Yes please", offer)).toBe("Tokyo");
    expect(detectImageIntent("Sure, go ahead", offer)).toBe("Tokyo");
    expect(detectImageIntent("pull it up", offer)).toBe("Tokyo");
    expect(detectImageIntent("show me", offer)).toBe("Tokyo");
    expect(detectImageIntent("Pull up Tokyo", offer)).toBe("Tokyo");
    // An explicit subject wins over the offer.
    expect(detectImageIntent("Show me Osaka", offer)).toBe("Osaka");
    expect(detectImageIntent("No thanks", offer)).toBeNull();
  });
});

describe("offeredSubject", () => {
  it.each([
    ["I can pull up Tokyo if you want.", "Tokyo"],
    ["Want me to show you some photos of Mount Fuji?", "Mount Fuji"],
    ["Would you like to see pictures of the Great Wall?", "Great Wall"],
    ["It was built in 1889. Shall I bring up the Eiffel Tower? [[images: Paris]]", "Eiffel Tower"],
    ["I can show you how it works step by step.", ""],
    ["The Krebs cycle has eight steps.", ""],
  ])("%s → %s", (text, expected) => {
    expect(offeredSubject(text)).toBe(expected);
  });
});
