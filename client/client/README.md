# Project Title: Animation Engine

## Description
This project is an animation engine that allows users to upload ZIP files containing 3D models for processing. It utilizes Autodesk's Viewer API to display the models and provides a user-friendly interface for managing uploads, processing status, and results.

## Features
- Upload ZIP files for processing.
- View processing status with progress updates.
- Display 3D models using Autodesk's Viewer API.
- Generate animations from processed results.
- Session management with token refresh.

## Folder Structure
```
client
├── src
│   ├── components
│   │   ├── CountdownTimer.jsx
│   │   ├── ModelViewer.jsx
│   │   ├── ProcessingStatus.jsx
│   ├── pages
│   │   ├── ProcessingPage.jsx
│   │   ├── ResultsPage.jsx
│   │   └── UploadPage.jsx
│   ├── utils
│   │   └── storageManager.js
│   ├── App.jsx
│   └── index.js
├── package.json
├── README.md
└── tailwind.config.js
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd client
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Usage
1. Start the development server:
   ```
   npm start
   ```
2. Open your browser and navigate to `http://localhost:3000` to access the application.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.