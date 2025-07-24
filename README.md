# S3Droid Scanner - AI-Powered S3 Bucket Browser

S3Droid Scanner is a web-based tool built with Next.js and Genkit that provides a powerful and intuitive interface for browsing, searching, and analyzing publicly accessible S3 buckets. It leverages Google's Generative AI to offer deep insights into potential security misconfigurations.

![S3Droid Screenshot](https://placehold.co/800x500.png?text=S3Droid+UI+Screenshot)

## Features

- **S3 Bucket Browsing:** Navigate through S3 bucket files and folders with a clean, intuitive UI.
- **Robust Pagination:** Efficiently handles directories with thousands or millions of files without crashing the browser.
- **Global File Search:** Perform a recursive search for files across an entire S3 bucket.
- **Advanced Filtering & Sorting:** Sort files by name or last modified date, and filter by common or custom file extensions.
- **AI-Powered Security Analysis:** For vulnerable buckets, leverage Google's AI (via Genkit) to get:
    - A human-readable summary of the misconfiguration.
    - Anomaly detection against security best practices.
    - Actionable recommendations to secure the bucket.
- **CORS Bypass:** Utilizes a backend proxy to reliably browse any publicly listable S3 bucket, regardless of its CORS policy.
- **Modern Tech Stack:** Built with Next.js App Router, ShadCN UI components, and Tailwind CSS for a responsive and modern user experience.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Generative AI:** [Google AI & Genkit](https://firebase.google.com/docs/genkit)
- **UI:** [React](https://react.dev/), [ShadCN UI](https://ui.shadcn.com/), [Lucide Icons](https://lucide.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Deployment:** Ready for [Firebase App Hosting](https://firebase.google.com/docs/hosting), [Vercel](https://vercel.com/), or [Netlify](https://www.netlify.com/).

---

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/) or a compatible package manager
- A Google AI API Key for Genkit functionality. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/s3droid-scanner.git
    cd s3droid-scanner
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a new file named `.env` in the root of your project and add your Google AI API key:
    ```.env
    GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```
    This is required for the AI analysis features to work.

4.  **Run the development server:**
    The application consists of two parts: the Next.js web app and the Genkit AI flows. You'll need to run them separately.

    -   **Start the Next.js app:**
        ```bash
        npm run dev
        ```
        The application will be available at `http://localhost:9002`.

    -   **Start the Genkit development UI (in a separate terminal):**
        ```bash
        npm run genkit:watch
        ```
        This starts the Genkit reflection server and provides a developer UI at `http://localhost:4000` for inspecting your AI flows.

---

## Deployment

This application is ready to be deployed on any hosting platform that supports Node.js. Here are the recommended free options:

### Option 1: Firebase App Hosting (Recommended)

The project is pre-configured for Firebase App Hosting.

1.  Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to the **App Hosting** section and connect your GitHub repository.
3.  Firebase will automatically detect the `apphosting.yaml` file and deploy your application.
4.  Remember to add your `GEMINI_API_KEY` as a secret in the App Hosting settings.

### Option 2: Vercel

1.  Push your code to a GitHub repository.
2.  Create a free account on [Vercel](https://vercel.com/).
3.  Import your GitHub repository into Vercel. It will automatically detect the Next.js framework.
4.  In the Vercel project settings, add your `GEMINI_API_KEY` as an Environment Variable.
5.  Vercel will build and deploy your application.

Your app is now ready to be used and shared!