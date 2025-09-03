import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { Button } from './button';

describe('Button Component', () => {
  it('should render with text content', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply variant classes', () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    let button = screen.getByRole('button', { name: /default/i });
    expect(button.className).toContain('bg-primary');
    
    rerender(<Button variant="destructive">Destructive</Button>);
    button = screen.getByRole('button', { name: /destructive/i });
    expect(button.className).toContain('bg-destructive');
    
    rerender(<Button variant="outline">Outline</Button>);
    button = screen.getByRole('button', { name: /outline/i });
    expect(button.className).toContain('border-input');
  });

  it('should apply size classes', () => {
    const { rerender } = render(<Button size="default">Default</Button>);
    let button = screen.getByRole('button', { name: /default/i });
    expect(button.className).toContain('h-10');
    
    rerender(<Button size="sm">Small</Button>);
    button = screen.getByRole('button', { name: /small/i });
    expect(button.className).toContain('h-9');
    
    rerender(<Button size="lg">Large</Button>);
    button = screen.getByRole('button', { name: /large/i });
    expect(button.className).toContain('h-11');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
    expect(button.className).toContain('disabled:pointer-events-none');
  });

  it('should render as a child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    
    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });

  it('should forward refs correctly', () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Button with ref</Button>);
    
    expect(ref).toHaveBeenCalled();
  });

  it('should merge custom className with default classes', () => {
    render(<Button className="custom-class">Custom</Button>);
    
    const button = screen.getByRole('button', { name: /custom/i });
    expect(button.className).toContain('custom-class');
    expect(button.className).toContain('inline-flex'); // default class
  });
});