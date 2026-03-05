exports.mapInvoiceToArthaLedger = function mapInvoiceToArthaLedger(inv) {
  return {
    source: 'crm',
    reference: inv.invoice_number,
    customer_id: inv.customer_id,
    currency: inv.currency,
    total_amount: inv.total_amount,
    lines: inv.items.map((it, idx) => ({
      index: idx + 1,
      sku: it.sku,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      gl_code: it.gl_code || '4000',
      cost_center: it.cost_center || null,
      amount: Number((it.quantity * it.unit_price).toFixed(2)),
    })),
    issued_at: inv.issued_at,
    due_at: inv.due_at || null,
  };
};
