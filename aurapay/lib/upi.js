export const upiUrl = (b) =>
  `upi://pay?pa=${encodeURIComponent(b.upi_vpa)}&pn=${encodeURIComponent(b.title)}&am=${b.amount}&cu=INR&tn=${encodeURIComponent(b.title + ' bill')}`;
