export async function generateAiPoster(prompt: string): Promise<string> {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true`;
  // Pollinations.ai: the URL itself redirects to the generated image.
  // We return it directly — Image components will load it.
  return url;
}
