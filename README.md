# [NPM GUI Manager](https://github.com/augurios/NPM-GUI-Manager) 

![version](https://img.shields.io/badge/version-0.0.1-blue.svg)

## Overview

This project provides a graphical user interface for managing NPM packages.

## Project Structure

- `dist/`: Contains the production build files.
- `src/`: Contains the source code for the VueJS application.
- `public/`: Contains the public assets.
- `build/`: Contains the build configuration files.
- `main.js`: The main entry point for the Electron application.
- `preload.js`: Preload script for Electron.
- `utils.js`: Utility functions used in the project.

## NPM Scripts

- `serve`: Starts the development server using Vue CLI.
- `build`: Builds the VueJS application for production.
- `lint`: Lints the source code using ESLint.
- `start`: Starts the Electron application.
- `electron:serve`: Serves the VueJS application and starts Electron in development mode.
- `electron:build`: Builds the VueJS application and packages it with Electron.

## Dependencies

The project relies on various dependencies including VueJS, Bootstrap, FontAwesome, and others. For a complete list, refer to the `package.json` file.

## Development

To start the development version, run:
```bash
npm run electron:serve
```

To build the project for production, run:
```bash
npm run electron:build
```

To start the Electron application, run:
```bash
npm run start
```

For more information, refer to the official documentation of the dependencies and tools used in this project.

