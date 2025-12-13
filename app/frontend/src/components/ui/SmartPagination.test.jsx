import { fireEvent, render, screen } from '@testing-library/react';
import SmartPagination from './SmartPagination';

describe('SmartPagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    onPageChange: jest.fn(),
    itemsPerPage: 10,
    totalItems: 100,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pagination when totalPages > 1', () => {
    render(<SmartPagination {...defaultProps} />);

    expect(
      screen.getByText('Menampilkan 1-10 dari 100 pesanan')
    ).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('does not render when totalPages <= 1', () => {
    render(<SmartPagination {...defaultProps} totalPages={1} />);

    expect(screen.queryByText('Menampilkan')).not.toBeInTheDocument();
  });

  it('shows correct page numbers for first few pages', () => {
    render(<SmartPagination {...defaultProps} currentPage={1} />);

    // Should show: 1, 2, 3, ..., 10
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows correct page numbers for middle pages', () => {
    render(<SmartPagination {...defaultProps} currentPage={5} />);

    // Should show: 1, ..., 4, 5, 6, ..., 10
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows correct page numbers for last few pages', () => {
    render(<SmartPagination {...defaultProps} currentPage={10} />);

    // Should show: 1, ..., 8, 9, 10
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('handles small number of pages correctly', () => {
    render(
      <SmartPagination {...defaultProps} totalPages={3} currentPage={2} />
    );

    // Should show: 1, 2, 3
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText('...')).not.toBeInTheDocument();
  });

  it('calls onPageChange when page button is clicked', () => {
    const onPageChange = jest.fn();
    render(<SmartPagination {...defaultProps} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables Previous button on first page', () => {
    render(<SmartPagination {...defaultProps} currentPage={1} />);

    const prevButton = screen.getByText('Previous').closest('button');
    expect(prevButton).toBeDisabled();
  });

  it('disables Next button on last page', () => {
    render(<SmartPagination {...defaultProps} currentPage={10} />);

    const nextButton = screen.getByText('Next').closest('button');
    expect(nextButton).toBeDisabled();
  });

  it('disables all buttons when loading', () => {
    render(<SmartPagination {...defaultProps} isLoading={true} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('shows correct item range', () => {
    render(
      <SmartPagination
        {...defaultProps}
        currentPage={3}
        itemsPerPage={15}
        totalItems={150}
      />
    );

    expect(
      screen.getByText('Menampilkan 31-45 dari 150 pesanan')
    ).toBeInTheDocument();
  });
});







































































