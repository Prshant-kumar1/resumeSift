import { createRootRoute, HeadContent, Scripts, Link, Outlet } from "@tanstack/react-router";
import { ThemeProvider, NO_FLASH_THEME_SCRIPT } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="bg-aurora flex min-h-screen items-center justify-center px-4">
      <div className="glass-strong max-w-md rounded-2xl px-8 py-10 text-center">
        <h1 className="text-7xl font-bold text-gradient-teal">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ResumeSift — AI Resume Screening" },
      {
        name: "description",
        content:
          "ResumeSift uses AI to instantly screen resumes against job descriptions, surface top candidates and accelerate hiring.",
      },
      { property: "og:title", content: "ResumeSift — AI Resume Screening" },
      {
        property: "og:description",
        content: "AI-powered resume screening for modern hiring teams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "ResumeSift — AI Resume Screening" },
      { name: "description", content: "Resume Sifter Pro is an AI-powered web app for screening resumes against job descriptions." },
      { property: "og:description", content: "Resume Sifter Pro is an AI-powered web app for screening resumes against job descriptions." },
      { name: "twitter:description", content: "Resume Sifter Pro is an AI-powered web app for screening resumes against job descriptions." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7f707209-4c9a-4ea7-a021-794ac3f5278b/id-preview-2b715aa8--ea78dcdb-df85-4902-86c2-feeca4b9ba0b.lovable.app-1777809159074.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7f707209-4c9a-4ea7-a021-794ac3f5278b/id-preview-2b715aa8--ea78dcdb-df85-4902-86c2-feeca4b9ba0b.lovable.app-1777809159074.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [{ children: NO_FLASH_THEME_SCRIPT }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </ThemeProvider>
  );
}
