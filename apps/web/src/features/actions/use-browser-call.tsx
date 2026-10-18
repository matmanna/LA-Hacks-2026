import { ResponsiveOverlay } from "@betterbill/ui/components/bb/responsive-overlay";
import { Button } from "@betterbill/ui/components/button";
import {
  createLocalAudioTrack,
  type LocalAudioTrack,
  Room,
  RoomEvent,
  Track,
  TrackEvent,
} from "livekit-client";
import { useEffect, useRef, useState } from "react";

export function useBrowserCall() {
  const connection = useRef<{ room: Room; microphone: LocalAudioTrack } | null>(
    null,
  );
  const generation = useRef(0);
  const audio = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [message, setMessage] = useState("Connecting your microphone…");
  const [needsAudio, setNeedsAudio] = useState(false);

  function disconnect() {
    generation.current++;
    const current = connection.current;
    connection.current = null;
    current?.microphone.stop();
    void current?.room.disconnect();
    audio.current?.replaceChildren();
    setActive(false);
  }

  useEffect(
    () => () => {
      generation.current++;
      connection.current?.microphone.stop();
      void connection.current?.room.disconnect();
      connection.current = null;
    },
    [],
  );

  // Called from the approval click before any phone is dialed.
  async function prepare() {
    const attempt = ++generation.current;
    const room = new Room();
    // Unlock playback during the click, before a microphone prompt can delay it.
    void room.startAudio().catch(() => setNeedsAudio(true));
    let microphone: LocalAudioTrack;
    try {
      microphone = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
    } catch {
      void room.disconnect();
      throw new Error(
        "Allow microphone access to join in your browser, or choose Call my phone.",
      );
    }
    if (attempt !== generation.current) {
      microphone.stop();
      void room.disconnect();
      throw new Error("Browser call cancelled.");
    }
    connection.current = { room, microphone };
    microphone.on(TrackEvent.Ended, () => void room.disconnect());
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio)
        audio.current?.appendChild(track.attach());
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      for (const element of track.detach()) element.remove();
    });
    room.on(RoomEvent.AudioPlaybackStatusChanged, () =>
      setNeedsAudio(!room.canPlaybackAudio),
    );
    room.on(RoomEvent.Reconnecting, () =>
      setMessage("Reconnecting your browser…"),
    );
    room.on(RoomEvent.Reconnected, () =>
      setMessage("Connected. Speak directly when your approval is needed."),
    );
    room.on(RoomEvent.Disconnected, () => {
      if (connection.current?.room !== room) return;
      microphone.stop();
      connection.current = null;
      audio.current?.replaceChildren();
      setMessage("The call ended. You can review its result in Activity.");
    });
    setMuted(false);
    setNeedsAudio(false);
    setMessage("Connecting your microphone…");
  }

  async function connect(session: { serverUrl: string; token: string }) {
    const current = connection.current;
    if (!current)
      throw new Error(
        "Your microphone is no longer connected. Review a new call.",
      );
    setActive(true);
    await current.room.connect(session.serverUrl, session.token);
    if (connection.current !== current) {
      await current.room.disconnect();
      throw new Error("Browser call cancelled.");
    }
    setNeedsAudio(!current.room.canPlaybackAudio);
    if (current.room.canPlaybackAudio) await publishMicrophone();
    else
      setMessage(
        "Tap Enable sound to hear the introduction and connect billing.",
      );
  }

  async function publishMicrophone() {
    const current = connection.current;
    if (!current) return;
    if (
      !current.room.localParticipant.getTrackPublication(
        Track.Source.Microphone,
      )
    )
      await current.room.localParticipant.publishTrack(current.microphone);
    if (connection.current === current)
      setMessage(
        "Connected. Hear the introduction, then we'll call billing. Speak directly when your approval is needed.",
      );
  }

  async function enableSound() {
    try {
      await connection.current?.room.startAudio();
      await publishMicrophone();
    } catch {
      setMessage(
        "Allow sound and microphone access in your browser, then try Enable sound again.",
      );
    }
  }

  async function toggleMute() {
    const microphone = connection.current?.microphone;
    if (!microphone) return;
    try {
      if (microphone.isMuted) await microphone.unmute();
      else await microphone.mute();
      setMuted(microphone.isMuted);
    } catch {
      setMessage(
        "Could not change the microphone. Check your browser permissions.",
      );
    }
  }

  const panel = (
    <ResponsiveOverlay
      open={active}
      onOpenChange={(open) => {
        if (!open) disconnect();
      }}
      title="Your browser call"
      description="The advocate, you, and the billing representative share this call."
    >
      <p role="status" className="text-sm leading-6">
        {message}
      </p>
      <p className="text-muted-foreground text-sm leading-6">
        Keep this tab open. Use headphones if you can. Leaving this call ends it
        for everyone.
      </p>
      <div ref={audio} />
      {needsAudio && (
        <Button onClick={() => void enableSound()}>Enable sound</Button>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="secondary"
          disabled={!connection.current}
          aria-pressed={muted}
          onClick={() => void toggleMute()}
        >
          {muted ? "Unmute microphone" : "Mute microphone"}
        </Button>
        <Button onClick={disconnect}>
          {connection.current ? "End call" : "Close"}
        </Button>
      </div>
    </ResponsiveOverlay>
  );
  return { prepare, connect, disconnect, panel, active };
}
