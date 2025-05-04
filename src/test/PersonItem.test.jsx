import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonItem } from '../App.jsx';

// Mock these functions for testing
const mockDragStart = vi.fn();
const mockRemoveFromTeam = vi.fn();

describe('PersonItem Component', () => {
  it('renders person name and role correctly', () => {
    const person = { id: 'person1', name: 'Alice', role: 'Developer' };
    
    render(<PersonItem person={person} />);
    
    expect(screen.getByText('Alice (Developer)')).toBeInTheDocument();
  });

  it('calls onDragStart handler when dragging starts', async () => {
    const person = { id: 'person1', name: 'Alice', role: 'Developer' };
    const user = userEvent.setup();
    
    render(<PersonItem person={person} onDragStart={mockDragStart} />);
    
    const personElement = screen.getByText('Alice (Developer)');
    
    // Mock drag event since userEvent doesn't fully support drag operations
    const dragStartEvent = new Event('dragstart', { bubbles: true });
    dragStartEvent.dataTransfer = { setData: vi.fn() };
    
    personElement.dispatchEvent(dragStartEvent);
    
    expect(mockDragStart).toHaveBeenCalled();
  });
  
  it('shows remove button only for team members', () => {
    // Person without a team (unassigned)
    const unassignedPerson = { id: 'person1', name: 'Alice', role: 'Developer', teamId: null };
    const { rerender } = render(
      <PersonItem person={unassignedPerson} onRemoveFromTeam={mockRemoveFromTeam} />
    );
    
    // Remove button should not be present
    expect(screen.queryByTitle('Remove from team')).not.toBeInTheDocument();
    
    // Person with a team
    const teamPerson = { id: 'person1', name: 'Alice', role: 'Developer', teamId: 'team1' };
    rerender(<PersonItem person={teamPerson} onRemoveFromTeam={mockRemoveFromTeam} />);
    
    // Remove button should be present now
    expect(screen.getByTitle('Remove from team')).toBeInTheDocument();
  });
  
  it('calls onRemoveFromTeam when remove button is clicked', async () => {
    const person = { id: 'person1', name: 'Alice', role: 'Developer', teamId: 'team1' };
    const user = userEvent.setup();
    
    render(<PersonItem person={person} onRemoveFromTeam={mockRemoveFromTeam} />);
    
    const removeButton = screen.getByTitle('Remove from team');
    await user.click(removeButton);
    
    expect(mockRemoveFromTeam).toHaveBeenCalledWith('person1');
  });
});