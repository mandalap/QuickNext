import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from '../Register';
import { AuthProvider } from '../../../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';

jest.mock('axios');

describe('Register Component', () => {
  beforeEach(() => {
    axios.post.mockClear();
  });

  test('renders register form', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Register />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByText(/Buat Akun Baru/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nama Lengkap/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Konfirmasi Password/i)).toBeInTheDocument();
  });

  test('shows validation errors on empty submit', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Register />
        </AuthProvider>
      </BrowserRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /Daftar/i }));
    expect(await screen.findAllByText(/wajib diisi|tidak valid|min 8 karakter|tidak cocok/i)).toHaveLength(3);
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
          <Register />
        </AuthProvider>
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/Nama Lengkap/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/Konfirmasi Password/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Daftar/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('http://localhost:8000/api/register', {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        password_confirmation: 'password123',
      });
    });
  });

  test('shows error message on failed registration', async () => {
    axios.post.mockRejectedValue({
      response: {
        data: { message: 'Email sudah terdaftar' },
      },
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Register />
        </AuthProvider>
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/Nama Lengkap/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/Konfirmasi Password/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /Daftar/i }));

    expect(await screen.findByText(/Email sudah terdaftar/i)).toBeInTheDocument();
  });
});
