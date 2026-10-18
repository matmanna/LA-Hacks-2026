import {
  createLocalAudioTrack,
  Room,
} from "../../apps/web/node_modules/livekit-client";

// Browser-only test peer. No agent dispatch, SIP or ElevenLabs requests.
Object.assign(window, {
  async connectTestPeer(url: string, token: string) {
    const room = new Room();
    await room.connect(url, token);
    await room.localParticipant.publishTrack(await createLocalAudioTrack());
  },
});
