import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamItem } from '../App.jsx';

// Mock functions for testing
const mockDrop = vi.fn();
const mockRemovePerson = vi.fn();

describe('TeamItem Component', () => {
  const team = { id: 'team1', name: 'Frontend Team' };
  
  it('renders team name correctly', () => {
    render(<TeamItem team={team} people={[]} onDrop={mockDrop} onRemovePerson={mockRemovePerson} />);
    
    expect(screen.getByText('Frontend Team')).toBeInTheDocument();
  });
  
  it('displays empty state message when team has no members', () => {
    render(<TeamItem team={team} people={[]} onDrop={mockDrop} onRemovePerson={mockRemovePerson} />);
    
    expect(screen.getByText(/No members yet/i)).toBeInTheDocument();
  });
  
  it('renders team members correctly', () => {
    const people = [
      { id: 'person1', name: 'Alice', role: 'Developer', teamId: 'team1' },
      { id: 'person2', name: 'Bob', role: 'Designer', teamId: 'team1' },
      { id: 'person3', name: 'Charlie', role: 'Manager', teamId: 'team2' } // Different team
    ];
    
    render(<TeamItem team={team} people={people} onDrop={mockDrop} onRemovePerson={mockRemovePerson} />);
    
    // Should show only members of this team
    expect(screen.getByText('Alice (Developer)')).toBeInTheDocument();
    expect(screen.getByText('Bob (Designer)')).toBeInTheDocument();
    expect(screen.queryByText('Charlie (Manager)')).not.toBeInTheDocument();
  });
  
  it('calls onDrop handler when dropping person onto team', () => {
    render(<TeamItem team={team} people={[]} onDrop={mockDrop} onRemovePerson={mockRemovePerson} />);
    
    const teamElement = screen.getByText('Frontend Team').closest('div');
    
    // Create a mock drop event
    const dropEvent = new Event('drop', { bubbles: true });
    dropEvent.preventDefault = vi.fn();
    dropEvent.dataTransfer = { getData: () => 'person1' };
    
    teamElement.dispatchEvent(dropEvent);
    
    expect(mockDrop).toHaveBeenCalled();
  });
  
  it('shows remove buttons for team members', () => {
    const people = [
      { id: 'person1', name: 'Alice', role: 'Developer', teamId: 'team1' },
      { id: 'person2', name: 'Bob', role: 'Designer', teamId: 'team1' }
    ];
    
    render(<TeamItem team={team} people={people} onDrop={mockDrop} onRemovePerson={mockRemovePerson} />);
    
    // Should have two remove buttons (one for each team member)
    const removeButtons = screen.getAllByTitle('Remove from team');
    expect(removeButtons).toHaveLength(2);
  });
});