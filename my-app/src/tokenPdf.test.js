import { generateTokenPdf, downloadTokenPdf } from './tokenPdf';

describe('tokenPdf generator utility', () => {
  it('generates a valid PDF-1.4 string with required structures', () => {
    const pdf = generateTokenPdf({
      token: 'SEC-TEST-9999',
      topic: 'Safety Concern',
      date: '2026-10-25 12:00:00',
      reportedStaff: 'John Doe (Lead)',
    });

    expect(typeof pdf).toBe('string');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.includes('SEC-TEST-9999')).toBe(true);
    expect(pdf.includes('Safety Concern')).toBe(true);
    expect(pdf.includes('John Doe \\(Lead\\)')).toBe(true);
    expect(pdf.includes('xref')).toBe(true);
    expect(pdf.includes('%%EOF')).toBe(true);
  });

  it('escapes parentheses and special characters safely', () => {
    const pdf = generateTokenPdf({
      token: 'TK(123)',
      topic: 'Test (Special) \\ Details',
      date: 'Today',
      reportedStaff: 'Jane (Manager)',
    });

    expect(pdf.includes('TK\\(123\\)')).toBe(true);
    expect(pdf.includes('Test \\(Special\\) \\\\ Details')).toBe(true);
  });

  it('downloads token PDF without throwing in DOM environment', () => {
    const origCreateObjectURL = global.URL.createObjectURL;
    const origRevokeObjectURL = global.URL.revokeObjectURL;
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    const result = downloadTokenPdf({
      token: 'SEC-TEST-DOWNLOAD',
      topic: 'Test Topic',
      date: '2026-10-25',
    });

    expect(result).toBe(true);
    expect(global.URL.createObjectURL).toHaveBeenCalled();

    global.URL.createObjectURL = origCreateObjectURL;
    global.URL.revokeObjectURL = origRevokeObjectURL;
  });
});
