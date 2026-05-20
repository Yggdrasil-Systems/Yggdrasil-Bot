export function getPingSummary(interaction) {
  const websocketLatency = Math.round(interaction.client.ws.ping);

  return {
    websocketLatency,
    description: `Gateway latency: ${websocketLatency}ms`
  };
}
