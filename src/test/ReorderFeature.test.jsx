// filepath: /home/nic/git/team-organiser/src/test/ReorderFeature.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamItem } from '../App.jsx';
import * as dndKit from '@dnd-kit/core';
import * as sortable from '@dnd-kit/sortable';

// Mock the DndContext component to be able to simulate drag and drop events
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({ children, onDragEnd }) => {
      // Store onDragEnd handler for testing
      vi.stubGlobal('mockDndOnDragEnd', onDragEnd);
      return <div data-testid="dnd-context">{children}</div>;
    }
  };
});

// Mock the sortable components
vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual('@dnd-kit/sortable');
  return {
    ...actual,
    useSortable: () => ({
      attributes: { 'data-test-sortable': true },
      listeners: { 'data-test-listeners': true },
      setNodeRef: () => {},
      transform: null,
      transition: null,
      isDragging: false,
    }),
    SortableContext: ({ children }) => <div data-testid="sortable-context">{children}</div>,
    arrayMove: vi.fn((items, oldIndex, newIndex) => {
      // Implement a simplified version of array move for testing
      const result = [...items];
      const [removed] = result.splice(oldIndex, 1);
      result.splice(newIndex, 0, removed);
      return result;
    }),
  };
});

describe('Reordering Feature Tests', () => {
  // Mock functions for testing
  const mockDrop = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockReorderTeamMembers = vi.fn();
  
  const team = { id: 'team1', name: 'Frontend Team' };
  const people = [
    { id: 'person1', name: 'Alice', role: 'Developer', teamId: 'team1' },
    { id: 'person2', name: 'Bob', role: 'Designer', teamId: 'team1' },
    { id: 'person3', name: 'Charlie', role: 'QA', teamId: 'team1' }
  ];
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders team members within a sortable context', () => {
    render(
      <TeamItem 
        team={team} 
        people={people} 
        onDrop={mockDrop} 
        onRemovePerson={mockRemovePerson}
        onReorderTeamMembers={mockReorderTeamMembers}
      />
    );
    
    // Check that SortableContext is rendered
    expect(screen.getByTestId('sortable-context')).toBeInTheDocument();
    
    // Check that all team members are rendered
    expect(screen.getByText('Alice (Developer)')).toBeInTheDocument();
    expect(screen.getByText('Bob (Designer)')).toBeInTheDocument();
    expect(screen.getByText('Charlie (QA)')).toBeInTheDocument();
  });
  
  it('calls onReorderTeamMembers when drag ends with active and over items', () => {
    render(
      <TeamItem 
        team={team} 
        people={people} 
        onDrop={mockDrop} 
        onRemovePerson={mockRemovePerson}
        onReorderTeamMembers={mockReorderTeamMembers}
      />
    );
    
    // Get the globally stored onDragEnd function
    const onDragEndHandler = window.mockDndOnDragEnd;
    expect(typeof onDragEndHandler).toBe('function');
    
    // Simulate a drag end event where person1 is dragged over person3
    onDragEndHandler({
      active: { id: 'person1' },
      over: { id: 'person3' }
    });
    
    // Check that reorder function is called with correct params
    // oldIndex 0 (Alice) to newIndex 2 (Charlie)
    expect(mockReorderTeamMembers).toHaveBeenCalledWith('team1', 0, 2);
  });
  
  it('does not call onReorderTeamMembers when dragged over the same item', () => {
    render(
      <TeamItem 
        team={team} 
        people={people} 
        onDrop={mockDrop} 
        onRemovePerson={mockRemovePerson}
        onReorderTeamMembers={mockReorderTeamMembers}
      />
    );
    
    const onDragEndHandler = window.mockDndOnDragEnd;
    
    // Simulate dragging an item over itself
    onDragEndHandler({
      active: { id: 'person2' },
      over: { id: 'person2' }
    });
    
    // The reorder function should not be called
    expect(mockReorderTeamMembers).not.toHaveBeenCalled();
  });
  
  it('does not call onReorderTeamMembers when there is no over item', () => {
    render(
      <TeamItem 
        team={team} 
        people={people} 
        onDrop={mockDrop} 
        onRemovePerson={mockRemovePerson}
        onReorderTeamMembers={mockReorderTeamMembers}
      />
    );
    
    const onDragEndHandler = window.mockDndOnDragEnd;
    
    // Simulate dragging an item but not over any drop target
    onDragEndHandler({
      active: { id: 'person1' },
      over: null
    });
    
    // The reorder function should not be called
    expect(mockReorderTeamMembers).not.toHaveBeenCalled();
  });
});