/* Guards the per-category voucher-register wrappers: each must hand the right
   `category` + `title` to the shared VoucherRegisterPage engine. Calling the
   wrapper as a plain function returns its React element, so we can assert the
   injected props WITHOUT mounting the full PageLayout/DataTable/store tree. */
import {
  ReceiptRegisterPage, PaymentRegisterPage, ContraRegisterPage, JournalRegisterPage,
  RefundRegisterPage, ReissueRegisterPage, DebitNoteRegisterPage,
} from '../pages/voucher-register';

describe('voucher-register category wrappers', () => {
  const cases = [
    [ReceiptRegisterPage,   'receipt',     'Receipt Register'],
    [PaymentRegisterPage,   'payment',     'Payment Register'],
    [ContraRegisterPage,    'contra',      'Contra Register'],
    [JournalRegisterPage,   'journal',     'Journal Register'],
    [RefundRegisterPage,    'refund',      'Refund Register'],
    [ReissueRegisterPage,   'reissue',     'Reissue Register'],
    [DebitNoteRegisterPage, 'debit-note',  'Debit Note Register'],
  ];

  test.each(cases)('%p injects its category + title', (Wrapper, category, title) => {
    const el = Wrapper({ branch: 'BOM' });
    expect(el.props.category).toBe(category);
    expect(el.props.title).toBe(title);
    expect(el.props.branch).toBe('BOM'); // host props pass through
  });
});
