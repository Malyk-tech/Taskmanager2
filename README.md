# TaskFlow React

A personal task manager built with React, CSS and JavaScript.

## Features

- Add, edit, complete and delete tasks
- Local browser storage
- Due dates and times
- Reminder settings
- Overdue/forgotten task detection
- Browser notifications when permission is granted
- Search
- Filtering
- Sorting
- Categories
- Priorities
- Light/dark mode
- Responsive desktop/mobile interface

## Run

1. Install Node.js.
2. Open a terminal in this folder.
3. Run:

```bash
npm install
npm run dev
```

4. Open the local URL printed by Vite.

## Build

```bash
npm run build
```

The production files will be created in `dist/`.

## Important

The current reminder engine runs while the web application is active. Reliable notifications when a packaged Windows/Android app is fully closed should be added during the native packaging stage.
