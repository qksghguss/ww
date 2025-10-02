import { test, expect } from '@playwright/test';

test('사용자 로그인 폼 전환 및 제출 버튼 확인', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '사내 소모품 관리' })).toBeVisible();
  await page.getByRole('button', { name: '관리자 로그인' }).click();
  await expect(page.getByLabel('비밀번호')).toBeVisible();
  await expect(page.getByLabel('아이디')).toHaveCount(0);
  await page.getByRole('button', { name: '사용자 로그인' }).click();
  await expect(page.getByLabel('아이디')).toBeVisible();
});
