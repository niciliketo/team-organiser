import { useState, useEffect, useRef } from 'react';
import './App.css';

// --- Components ---

// Make PersonItem draggable when unassigned
function PersonItem({ person, isDraggable, onDragStart }) {
  const handleDragStart = (event) => {
    if (onDragStart) {
      onDragStart(event, person.id); // Pass person ID on drag start
    }
  };

  return (
    <li
      className="person-item"
      draggable={isDraggable} // Only draggable if prop is true
      onDragStart={isDraggable ? handleDragStart : undefined} // Only attach handler if draggable
      style={{ cursor: isDraggable ? 'grab' : 'default' }} // Visual cue
    >
      {person.name} ({person.role})
    </li>
  );
}

// Make TeamItem a drop target
function TeamItem({ team, people, onDrop }) {
  const teamMembers = people.filter(person => person.teamId === team.id);
  const [isDragOver, setIsDragOver] = useState(false); // State for drag-over styling

  const handleDragOver = (event) => {
    event.preventDefault(); // Necessary to allow dropping
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true); // Add style on drag over
  };

  const handleDragLeave = () => {
    setIsDragOver(false); // Remove style on drag leave
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false); // Remove style on drop
    if (onDrop) {
      onDrop(event, team.id); // Pass team ID on drop
    }
  };

  return (
    <div
      // Add 'drag-over' class conditionally
      className={`team-item card ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave} // Add drag leave handler
      onDrop={handleDrop}
    >
      <h3>{team.name}</h3>
      {teamMembers.length === 0 ? (
        <p>No members yet. Drag unassigned people here.</p> // Updated placeholder
      ) : (
        <ul className="person-list">
          {teamMembers.map(person => (
            // Pass isDraggable={false} for assigned people (cannot drag them yet)
            <PersonItem key={person.id} person={person} isDraggable={false} />
          ))}
        </ul>
      )}
    </div>
  );
}

function App() {
  // State for people, teams, and CSV input
  const [people, setPeople] = useState(() => {
    const savedPeople = localStorage.getItem('teamOrganiserPeople');
    return savedPeople ? JSON.parse(savedPeople) : [];
  });
  const [teams, setTeams] = useState(() => {
    const savedTeams = localStorage.getItem('teamOrganiserTeams');
    return savedTeams ? JSON.parse(savedTeams) : [];
  });
  const [csvInput, setCsvInput] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const fileInputRef = useRef(null); // Ref for the hidden file input

  // --- Local Storage Persistence ---
  useEffect(() => {
    localStorage.setItem('teamOrganiserPeople', JSON.stringify(people));
  }, [people]);

  useEffect(() => {
    localStorage.setItem('teamOrganiserTeams', JSON.stringify(teams));
  }, [teams]);

  // --- CSV Input Handling ---
  const handleInputChange = (event) => {
    setCsvInput(event.target.value);
  };

  const handleParseCsv = () => {
    const lines = csvInput.trim().split('\n');
    const parsedPeople = lines.map((line, index) => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const role = parts[1].trim();
        if (name && role) {
          // Simple unique ID - consider a more robust solution for larger apps
          return { id: `person-${name}-${role}-${Date.now()}-${index}`, name, role, teamId: null };
        }
      }
      return null; // Return null for invalid lines or lines with missing data
    }).filter(person => person !== null); // Filter out invalid entries

    // Add new people, avoiding duplicates based on name AND role already present (assigned or unassigned)
    setPeople(prevPeople => {
      const existingPeopleKeys = new Set(prevPeople.map(p => `${p.name}-${p.role}`));
      const newUniquePeople = parsedPeople.filter(p => !existingPeopleKeys.has(`${p.name}-${p.role}`));
      return [...prevPeople, ...newUniquePeople];
    });

    setCsvInput(''); // Clear the input field after parsing
  };

  // --- Team Management ---
  const handleNewTeamNameChange = (event) => {
    setNewTeamName(event.target.value);
  };

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return; // Don't add empty team names

    // Prevent adding teams with the same name (case-insensitive check)
    const existingTeam = teams.find(team => team.name.toLowerCase() === newTeamName.trim().toLowerCase());
    if (existingTeam) {
      alert(`Team "${newTeamName.trim()}" already exists.`);
      return;
    }

    const newTeam = {
      // Simple unique ID - consider a more robust solution for larger apps
      id: `team-${newTeamName.replace(/\s+/g, '-')}-${Date.now()}`,
      name: newTeamName.trim(),
    };

    setTeams(prevTeams => [...prevTeams, newTeam]);
    setNewTeamName(''); // Clear the input field
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (event, personId) => {
    event.dataTransfer.setData("personId", personId); // Store the ID of the person being dragged
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnTeam = (event, targetTeamId) => {
    const personId = event.dataTransfer.getData("personId");
    if (!personId) return; // Exit if no personId was found

    setPeople(prevPeople =>
      prevPeople.map(person =>
        person.id === personId
          ? { ...person, teamId: targetTeamId } // Update teamId for the dropped person
          : person
      )
    );
  };

  // --- Import/Export Handlers ---
  const handleExport = () => {
    const dataToExport = {
      people: people,
      teams: teams,
    };
    const jsonString = JSON.stringify(dataToExport, null, 2); // Pretty print JSON
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Simple date string for filename
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `team-organiser-data-${dateStr}.json`;
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    // Trigger the hidden file input
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Failed to read file content.');
        }
        const importedData = JSON.parse(text);

        // Basic validation
        if (!importedData || !Array.isArray(importedData.people) || !Array.isArray(importedData.teams)) {
          throw new Error('Invalid file format. Expected { people: [], teams: [] }.');
        }

        // Confirm before overwriting
        if (window.confirm('Importing this file will overwrite current people and teams. Continue?')) {
          setPeople(importedData.people);
          setTeams(importedData.teams);
          alert('Data imported successfully!');
        }
      } catch (error) {
        console.error("Import failed:", error);
        alert(`Import failed: ${error.message}`);
      } finally {
        // Reset file input value so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = (e) => {
      console.error("File reading error:", e);
      alert('Error reading file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // --- Filtering People ---
  const unassignedPeople = people.filter(person => person.teamId === null);

  // --- Rendering ---
  return (
    <div className="App">
      <h1>Team Organiser</h1>

      {/* Import/Export Buttons Area */}
      <div className="import-export-section">
        <button onClick={handleImportClick}>Import Data</button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelected}
          accept=".json"
          style={{ display: 'none' }} // Hide the actual file input
        />
        <button onClick={handleExport} disabled={people.length === 0 && teams.length === 0}>
          Export Data
        </button>
      </div>

      <div className="layout-container">
        {/* Left Column: Input and Unassigned People */}
        <div className="column input-column">
          <div className="input-section card">
            <h2>Add People (CSV: Name,Role)</h2>
            <textarea
              rows="5"
              // cols="40" // Let CSS handle width
              value={csvInput}
              onChange={handleInputChange}
              placeholder="Paste CSV data here, one person per line:\nAlice,Developer\nBob,Manager\nCharlie,QA"
            />
            <br />
            <button onClick={handleParseCsv} disabled={!csvInput.trim()}>
              Add People from CSV
            </button>
          </div>

          <div className="people-list-section card">
            <h2>Unassigned People</h2>
            {unassignedPeople.length === 0 ? (
              <p>No unassigned people. Add people using the CSV input above or check team assignments.</p>
            ) : (
              <ul className="person-list">
                {unassignedPeople.map(person => (
                  // Pass drag handler and isDraggable=true for unassigned people
                  <PersonItem
                    key={person.id}
                    person={person}
                    isDraggable={true}
                    onDragStart={handleDragStart}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Teams */}
        <div className="column teams-column">
          <div className="teams-section card">
            <h2>Teams</h2>

            {/* Team Creation Input */}
            <div className="add-team-section">
              <input
                type="text"
                value={newTeamName}
                onChange={handleNewTeamNameChange}
                placeholder="New team name"
              />
              <button onClick={handleAddTeam} disabled={!newTeamName.trim()}>
                Add Team
              </button>
            </div>

            {/* Display Existing Teams */}
            <div className="teams-list">
              {teams.length === 0 ? (
                <p>No teams created yet. Add a team above.</p>
              ) : (
                teams.map(team => (
                  // Pass drop handler to TeamItem
                  <TeamItem
                    key={team.id}
                    team={team}
                    people={people}
                    onDrop={handleDropOnTeam}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
