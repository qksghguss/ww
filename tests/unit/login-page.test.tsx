import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { describe, it, expect } from 'vitest';
import { AuthProvider } from '../../src/context/auth-context';
import { DataProvider } from '../../src/context/data-context';
import { LoginPage } from '../../src/pages/login-page';

function renderWithProviders() {
  return render(
    <DataProvider>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </DataProvider>
  );
}

describe('LoginPage', () => {
  it('toggles between user and admin login', async () => {
    renderWithProviders();
    await act(async () => {
      await Promise.resolve();
    });
    await screen.findByRole('button', { name: '로그인' });
    const adminButton = screen.getByRole('button', { name: '관리자 로그인' });
    fireEvent.click(adminButton);
    expect(screen.queryByLabelText('아이디')).not.toBeInTheDocument();
    const userButton = screen.getByRole('button', { name: '사용자 로그인' });
    fireEvent.click(userButton);
    expect(screen.getByLabelText('아이디')).toBeInTheDocument();
  });
});
