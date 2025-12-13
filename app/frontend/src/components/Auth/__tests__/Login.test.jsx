import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../Login';
import { AuthProvider } from '../../../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';

jest.mock('axios');

describe('Login Component', () => {
  beforeEach(() => {
    axios.post.mockClear();
  });

  test('renders login form', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByText(/Masuk/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  test('shows validation errors on empty submit', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /Masuk/i }));
    expect(await screen.findAllByText(/wajib diisi|tidak valid/i)).toHaveLength(2);
  });

  test('submits form successfully', async () => {
    axios.post.mockResolvedValue({
      data: {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        token: 'fake-token',
      },
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Masuk/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('http://localhost:8000/api/login', {
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  test('shows error message on failed login', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: { message: 'Email atau password salah' },
      },
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpassword' } });

    fireEvent.click(screen.getByRole('button', { name: /Masuk/i }));

    expect(await screen.findByText(/Email atau password salah/i)).toBeInTheDocument();
  });
});
