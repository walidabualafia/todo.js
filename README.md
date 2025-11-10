# Todo.js

A modern, Slack-inspired todo application with a clean and intuitive interface. Built with vanilla JavaScript, this lightweight app helps you organize tasks with deadlines, subtasks, and smart filtering.

## Features

- **Clean Slack-Inspired UI** - Modern, professional interface with sidebar navigation
- **Task Management** - Create, edit, delete, and complete tasks with ease
- **Deadlines & Reminders** - Set date and time deadlines with visual indicators for overdue and upcoming tasks
- **Subtasks** - Break down complex tasks into manageable subtasks
- **Smart Filtering** - View all tasks, active tasks, or completed tasks
- **Local Storage** - All tasks are saved locally in your browser
- **Statistics Dashboard** - Track total, completed, and active tasks at a glance
- **Responsive Design** - Works seamlessly on desktop and mobile devices

## Demo

The app includes:
- Task creation with optional deadlines
- Task editing and deletion
- Checkbox completion tracking
- Subtask management
- Filter views (All, Active, Completed)
- Overdue task highlighting
- Real-time statistics

## Installation

1. Clone the repository:
```bash
git clone https://github.com/walidabualafia/todo.js.git
cd todo.js
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:8097
```

## Usage

### Adding a Task
1. Type your task in the input field
2. Optionally set a deadline date and time
3. Click "Add" or press Enter

### Managing Tasks
- **Complete a task**: Click the checkbox next to the task
- **Edit a task**: Click the "Edit" button to modify the task or deadline
- **Delete a task**: Click the "Delete" button and confirm

### Working with Subtasks
1. Click on a task to expand subtask options
2. Type a subtask in the input field below the main task
3. Click "Add" to create the subtask
4. Complete or delete subtasks independently

### Filtering Tasks
- **All Tasks**: Shows all tasks regardless of status
- **Active**: Shows only incomplete tasks
- **Completed**: Shows only completed tasks

Use the sidebar navigation or filter buttons to switch between views.

## Project Structure

```
todo.js/
├── index.html      # Main application file with HTML, CSS, and JavaScript
├── server.js       # Simple HTTP server
├── package.json    # Project configuration
└── README.md       # This file
```

## Technologies Used

- **HTML5** - Structure
- **CSS3** - Slack-inspired styling with modern design patterns
- **Vanilla JavaScript** - Client-side functionality
- **Node.js** - Simple HTTP server
- **LocalStorage API** - Data persistence

## Development

To run in development mode:
```bash
npm run dev
```

This will clean up any existing processes on port 8097 and start the server.

## Features in Detail

### Deadline Management
- Set both date and time for tasks
- Visual badges indicate:
  - **Overdue** tasks (red badge)
  - **Today** tasks (orange badge)
  - **Upcoming** tasks (green badge)

### Task Statistics
Real-time counters show:
- Total tasks
- Completed tasks
- Active tasks

### Data Persistence
All tasks are automatically saved to browser localStorage, so your tasks persist between sessions.

## Browser Support

Works on all modern browsers that support:
- LocalStorage API
- ES6 JavaScript
- CSS Grid and Flexbox

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

walid

## Acknowledgments

- UI design inspired by Slack's interface
- Built with vanilla JavaScript for maximum compatibility and performance
