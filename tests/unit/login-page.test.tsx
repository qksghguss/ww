import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { AuthProvider } from '../../src/context/auth-context';
import { DataProvider } from '../../src/context/data-context';
import { LoginPage } from '../../src/pages/login-page';
import { createInitialDataState } from '../../src/data/initial-state';
import { setRepository, type DataRepository } from '../../src/services/data-repository';

const mockStore: { state: ReturnType<typeof createInitialDataState> | null } = {
  state: createInitialDataState()
};

const mockRepository: DataRepository = {
  async load() {
    return mockStore.state ?? createInitialDataState();
  },
  async save(state) {
    mockStore.state = state;
  },
  async clear() {
    mockStore.state = null;
  }
};

beforeEach(() => {
  mockStore.state = createInitialDataState();
  setRepository(mockRepository);
});

afterEach(() => {
  setRepository(null);
});

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
