import { loadAndGenerateTestReport } from '../generateReport';

describe('generateTestReport', () => {
  it('should generate a test report', async () => {
    loadAndGenerateTestReport();
  });
});
