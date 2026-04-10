/**
 * Order flowers for delivery.
 * STUB — to be implemented with 1-800-Flowers / FTD integration.
 */
async function orderFlowers(instructions, context, job) {
  await job.updateProgress(10);

  const { recipient_name, delivery_address, delivery_date, budget, preferences } = instructions;

  // TODO: Implement with Playwright
  // 1. Search flower delivery sites for arrangements in budget
  // 2. Filter by delivery date availability and recipient's preferences
  // 3. Select best option, add to cart
  // 4. Pause for user confirmation before placing order
  // 5. Complete purchase and return confirmation

  await job.updateProgress(100);

  return {
    status: 'stub',
    message: 'Flower ordering is not yet implemented. This is a placeholder.',
    request: {
      recipient_name,
      delivery_address,
      delivery_date,
      budget,
      preferences
    },
    generated_at: new Date().toISOString()
  };
}

module.exports = orderFlowers;
