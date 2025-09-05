# AI Rules for Dockora Application Development

This document outlines the core technologies and preferred libraries for developing the Dockora application. Adhering to these guidelines ensures consistency, maintainability, and leverages the strengths of our chosen tech stack.

## Tech Stack Overview

*   **Frontend Framework:** React.js for building interactive user interfaces.
*   **Frontend Language:** TypeScript is the preferred language for new frontend components, ensuring type safety and better developer experience. Existing `.jsx` files will be maintained as is unless refactoring is explicitly requested.
*   **Styling:** Tailwind CSS for all styling, providing a utility-first approach for responsive and consistent designs.
*   **UI Components:** shadcn/ui and Radix UI are the go-to libraries for pre-built, accessible, and customizable UI components.
*   **Backend Framework:** Python with Flask, providing a lightweight and flexible web framework.
*   **Database:** PostgreSQL, managed via Docker, for robust data storage.
*   **ORM:** SQLAlchemy for object-relational mapping in the Python backend, simplifying database interactions.
*   **Container Orchestration:** Docker and Docker Compose for defining and running multi-container Docker applications.
*   **API Communication:** `axios` on the frontend and `requests` on the backend for making HTTP requests.
*   **Icons:** `lucide-react` for a consistent and customizable icon set across the frontend.
*   **Notifications:** `react-hot-toast` for user feedback and alerts.

## Library Usage Guidelines

To maintain a clean and efficient codebase, please follow these guidelines for library usage:

*   **React & TypeScript:** All new frontend components should be written in TypeScript (`.tsx`). Existing `.jsx` files should be updated to `.tsx` if significant changes are made or a refactor is requested.
*   **React Router DOM:** Use for all client-side routing within the React application.
*   **Tailwind CSS:** Apply Tailwind utility classes for all styling. Avoid inline styles or custom CSS files unless absolutely necessary for complex, unique scenarios not covered by Tailwind.
*   **shadcn/ui & Radix UI:** Prioritize these libraries for common UI elements (buttons, forms, dialogs, etc.). If a specific component is needed that isn't available, create a new, small, and focused component using Tailwind CSS. Do not modify shadcn/ui component files directly; instead, create new components that wrap or extend their functionality.
*   **lucide-react:** Use exclusively for all icons.
*   **react-hot-toast:** Implement all toast notifications using this library.
*   **axios:** This is the standard for all HTTP requests from the frontend to the backend API.
*   **react-grid-layout & react-resizable:** These are specifically for the dashboard's draggable and resizable widget layout.
*   **chart.js & react-chartjs-2:** Use for any data visualization or charting requirements.
*   **js-yaml:** For parsing and serializing YAML data, particularly for Docker Compose configurations.
*   **Flask:** The primary framework for all backend API endpoints.
*   **SQLAlchemy:** All database interactions in the backend should go through SQLAlchemy models and sessions.
*   **Flask-Bcrypt:** Use for hashing and verifying user passwords.
*   **Docker SDK for Python (`docker`):** Directly interact with the Docker daemon for container and image management.
*   **psutil:** For retrieving system-level information and statistics (CPU, memory, disk, network).
*   **requests (Python):** For making HTTP requests from the backend to external services (e.g., weather APIs, download clients).
*   **smtplib & email.mime.text:** For sending emails from the backend (e.g., password reset).
*   **subprocess, tempfile, shutil:** Use these Python modules for executing shell commands (like `docker compose`), managing temporary files, and performing file system operations, especially when interacting with Docker Compose files.