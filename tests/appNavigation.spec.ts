import { test, expect } from './fixtures';
import { ROUTES } from '../src/constants';

test.describe('navigating app', () => {
  test('wizard page should render successfully', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.Wizard}`);
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  });
});
