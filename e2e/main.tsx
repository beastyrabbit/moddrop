import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Editor } from "tldraw";
import { CanvasEditor } from "../components/stream-canvas/CanvasEditor";
import { CanvasMirror } from "../components/stream-canvas/CanvasMirror";
import OBSLayout from "../app/obs/layout";
import { UserMultiSelect } from "../components/stream-canvas/UserMultiSelect";
import { MediaPreferencesProvider } from "../components/stream-canvas/media-preferences";
import { TwitchPreview } from "../components/stream-canvas/TwitchPreview";
import "../app/globals.css";

declare global {
  interface Window {
    fixtureEditor?: Editor;
  }
}
function Fixture() {
  const [session, setSession] = useState<{
    roomId: string;
    secret: string;
  } | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  useEffect(() => {
    void fetch("/__test/session")
      .then((response) => response.json())
      .then(setSession);
  }, []);
  if (!session) return <p>Preparing room…</p>;
  const view = new URLSearchParams(location.search).get("view");
  if (view === "mirror")
    return (
      <OBSLayout>
        <CanvasMirror obsSecret={session.secret} />
      </OBSLayout>
    );
  if (view === "controls")
    return (
      <main className="mx-auto max-w-xl space-y-8 p-8">
        <h1 className="text-2xl font-semibold">Room collaborators</h1>
        <label htmlFor="members">Invite a collaborator</label>
        <UserMultiSelect
          value={members}
          onChange={setMembers}
          inputId="members"
        />
        <h2 className="text-xl">Stream preview</h2>
        <div className="h-64">
          <MediaPreferencesProvider
            roomId={session.roomId}
            userId="user_fixture_owner"
          >
            <TwitchPreview channel="fixture" hostname="localhost" interactive />
          </MediaPreferencesProvider>
        </div>
      </main>
    );
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <CanvasEditor
        roomId={session.roomId}
        twitchChannel={null}
        youtubePolicy="preview_only"
        onMount={(editor) => {
          window.fixtureEditor = editor;
        }}
      />
    </div>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Fixture root is missing");
createRoot(root).render(<Fixture />);
