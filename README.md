# 🐳 Dockora - Your Self-Hosted Docker Dashboard

Dockora is a modern, self-hosted dashboard designed to simplify the management of your Docker containers, applications, and stacks. It provides a clean, customizable interface with various widgets to monitor your system and access your services with ease.

## 🤖 Built with [AI](https://example-ai-link.com)



This dashboard was powered by state-of-the-art Google Gemini
with huge thanks to [**Dyad**](https://www.dyad.sh/) for enabling its creation.

![Dockora](https://fsgezdakoianpjhingyz.supabase.co/storage/v1/object/public/images/3d2f1b02-aff2-49ef-a113-b05b26c3348a.png)

## ✨ Key Features

-   **Container & Image Management**: View, start, stop, restart, and manage all your Docker containers and images directly from the UI.
-   **Stack Creator**: Easily create and deploy multi-container applications using a visual editor or by pasting raw `docker-compose.yml` content.
-   **Customizable Dashboard**: A drag-and-drop grid layout with a variety of widgets:
    -   **App Launcher**: Quick access to your running applications.
    -   **System Usage**: Real-time monitoring of CPU, RAM, and Disk usage.
    -   **Network Status**: Track network speed, IP addresses, and connection status.
    -   **qBittorrent**: Monitor your active downloads.
    -   **Weather, Time, Tasks**, and more.
-   **User Management**: Features admin and user roles, allowing you to share access to applications securely.
-   **SSH Terminal**: Execute commands on a remote server directly from the Dockora settings page (Admin only).
-   **Notifications**: Get notified about important system events, like a container stopping unexpectedly.

## 🛠️ Tech Stack

Dockora is built with a modern and robust tech stack:

-   **Backend**:
    -   **Framework**: Python with Flask
    -   **Database**: PostgreSQL
    -   **ORM**: SQLAlchemy
    -   **Docker Interaction**: Docker SDK for Python
-   **Frontend**:
    -   **Framework**: React.js with Vite
    -   **Language**: TypeScript
    -   **Styling**: Tailwind CSS
    -   **UI Components**: shadcn/ui & Radix UI
    -   **API Communication**: Axios
    -   **Charting**: Chart.js
-   **Core Infrastructure**:
    -   **Containerization**: Docker & Docker Compose

## 🚀 Getting Started

### Prerequisites

-   [Docker](https://docs.docker.com/get-docker/)
-   [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/dockora.git
    cd dockora
    ```

2.  **Configure Environment Variables (Optional):**
    You can modify the `docker-compose.yml` file to change the default database credentials or the application's `SECRET_KEY`.

3.  **Build and Run with Docker Compose:**
    ```bash
    docker compose up -d --build
    ```

4.  **Access Dockora:**
    -   The frontend will be available at `http://localhost:3000`.
    -   The backend API runs on `http://localhost:5000`.

### First-Time Setup

When you first access Dockora, you will be guided through a setup process to create your initial admin account. After that, you can log in and start managing your Docker environment!

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features, improvements, or bug fixes, please feel free to open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.