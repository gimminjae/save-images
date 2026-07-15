import { EventSceneBackdrop } from "@/components/event-scene-backdrop";
import { FloatingUploadButton } from "@/components/floating-upload-button";

type SiteShellProps = {
  children: React.ReactNode;
  currentPath: string;
  showBackdrop?: boolean;
  fullBleed?: boolean;
  mainClassName?: string;
  contentClassName?: string;
};

export function SiteShell({
  children,
  currentPath,
  showBackdrop = true,
  fullBleed = false,
  mainClassName = "",
  contentClassName = "",
}: SiteShellProps) {
  return (
    <main
      className={`relative min-h-screen overflow-hidden ${
        fullBleed ? "" : "px-3 py-3 sm:px-6 sm:py-6"
      } ${mainClassName}`}
    >
      {showBackdrop ? <EventSceneBackdrop /> : null}
      <div
        className={`mx-auto flex w-full flex-col ${
          fullBleed ? "max-w-none gap-0" : "max-w-7xl gap-4 sm:gap-5"
        } ${contentClassName}`}
      >
        {children}
      </div>
      <FloatingUploadButton currentPath={currentPath} />
    </main>
  );
}
