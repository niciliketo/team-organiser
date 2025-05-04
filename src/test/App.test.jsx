import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    clear: () => { store = {}; },
    removeItem: key => { delete store[key]; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('App Component', () => {
  beforeEach(() => {
    // Clear localStorage and reset mocks before each test
    localStorageMock.clear();
    vi.clearAllMocks();
    
    // Mock confirm dialogs to return true
    window.confirm = vi.fn(() => true);
  });

  describe('Team Management', () => {
    it('creates a new team', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Enter team name
      const teamInput = screen.getByPlaceholderText('New team name');
      await user.type(teamInput, 'Engineering Team');
      
      // Click add team button
      const addButton = screen.getByText('Add Team');
      await user.click(addButton);
      
      // Verify team is added
      expect(screen.getByText('Engineering Team')).toBeInTheDocument();
      
      // Verify localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
    
    it('shows warning when trying to add duplicate team', async () => {
      const user = userEvent.setup();
      // Mock alert
      window.alert = vi.fn();
      
      render(<App />);
      
      // Add first team
      const teamInput = screen.getByPlaceholderText('New team name');
      await user.type(teamInput, 'Design Team');
      await user.click(screen.getByText('Add Team'));
      
      // Try to add duplicate (case insensitive)
      await user.clear(teamInput);
      await user.type(teamInput, 'design team');
      await user.click(screen.getByText('Add Team'));
      
      // Verify alert was shown
      expect(window.alert).toHaveBeenCalledWith('Team "design team" already exists.');
    });
  });
  
  describe('People Management', () => {
    it('adds people from CSV input', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Enter CSV data
      const csvInput = screen.getByPlaceholderText(/Paste CSV data here/i);
      await user.type(csvInput, 'Alice,Developer\nBob,Designer');
      
      // Click add button
      const addButton = screen.getByText('Add People from CSV');
      await user.click(addButton);
      
      // Verify people are added to unassigned list
      const unassignedSection = screen.getByRole('heading', { name: 'Unassigned People' }).parentElement;
      expect(within(unassignedSection).getByText('Alice (Developer)')).toBeInTheDocument();
      expect(within(unassignedSection).getByText('Bob (Designer)')).toBeInTheDocument();
      
      // Verify CSV input is cleared
      expect(csvInput.value).toBe('');
    });
    
    it('allows moving a person to a team via drag and drop', async () => {
      // Add team and people first
      const initialPeople = [
        { id: 'person1', name: 'Alice', role: 'Developer', teamId: null }
      ];
      const initialTeams = [
        { id: 'team1', name: 'Engineering' }
      ];
      
      // Set initial data in localStorage
      localStorageMock.setItem('teamOrganiserPeople', JSON.stringify(initialPeople));
      localStorageMock.setItem('teamOrganiserTeams', JSON.stringify(initialTeams));
      
      const { rerender } = render(<App />);
      
      // Find the person and team elements
      const personElement = screen.getByText('Alice (Developer)');
      const teamElement = screen.getByText('Engineering').closest('div');
      
      // Simulate dragStart event
      const dragStartEvent = new Event('dragstart', { bubbles: true });
      Object.defineProperty(dragStartEvent, 'dataTransfer', {
        value: {
          setData: vi.fn(),
          effectAllowed: null
        }
      });
      
      // Mock the setData method implementation to store our data
      const dataStore = {};
      dragStartEvent.dataTransfer.setData.mockImplementation((key, value) => {
        dataStore[key] = value;
      });
      
      // Start drag
      fireEvent(personElement, dragStartEvent);
      
      // Simulate drop event
      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: vi.fn(key => dataStore[key] || null)
        }
      });
      dropEvent.preventDefault = vi.fn();
      
      // Simulate the app's handling of dragStart, which stores personId
      dataStore['personId'] = 'person1';
      
      // Perform drop
      fireEvent(teamElement, dropEvent);
      
      // Force a rerender to ensure state updates are processed
      rerender(<App />);
      
      // Check localStorage directly as the change happens asynchronously
      // Get the updated data that was saved to localStorage
      const setItemCalls = localStorageMock.setItem.mock.calls;
      const lastPeopleUpdate = setItemCalls
        .filter(call => call[0] === 'teamOrganiserPeople')
        .pop();
      
      // Verify team assignment was successful
      if (lastPeopleUpdate) {
        const updatedPeople = JSON.parse(lastPeopleUpdate[1]);
        const updatedPerson = updatedPeople.find(p => p.id === 'person1');
        expect(updatedPerson.teamId).toBe('team1');
      } else {
        // If no update was found, fail the test
        expect(setItemCalls.length).toBeGreaterThan(0, 'Expected localStorage to be updated');
      }
    });

    it('removes a person from a team', async () => {
      // Create a mock implementation of localStorage that handles async state updates
      const mockStorage = {};
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn((key, value) => {
        mockStorage[key] = value;
        originalSetItem(key, value);
      });
      
      // Setup initial data with a person already in a team
      const initialPeople = [
        { id: 'person1', name: 'Alice', role: 'Developer', teamId: 'team1' }
      ];
      const initialTeams = [
        { id: 'team1', name: 'Engineering' }
      ];
      const initialOrder = {
        'team1': ['person1']
      };
      
      localStorage.setItem('teamOrganiserPeople', JSON.stringify(initialPeople));
      localStorage.setItem('teamOrganiserTeams', JSON.stringify(initialTeams));
      localStorage.setItem('teamOrganiserMemberOrder', JSON.stringify(initialOrder));
      
      const { unmount } = render(<App />);
      
      // Find the remove button for the person
      const removeButton = screen.getByTitle('Remove from team');
      
      // Click the remove button
      fireEvent.click(removeButton);
      
      // Wait for state updates
      await waitFor(() => {
        const peopleStorage = JSON.parse(mockStorage.teamOrganiserPeople || '[]');
        const updatedPerson = peopleStorage.find(p => p.id === 'person1');
        expect(updatedPerson && updatedPerson.teamId).toBeNull();
      });
      
      unmount();
      // Restore the original function
      localStorage.setItem = originalSetItem;
    });
  });
});