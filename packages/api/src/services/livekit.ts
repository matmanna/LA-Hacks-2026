import { CONFERENCE_FLOW_VERSION } from "@betterbill/core";
import {
  AccessToken,
  AgentDispatchClient,
  JobRestartPolicy,
  RoomServiceClient,
  TrackSource,
} from "livekit-server-sdk";

export async function browserPatientSession(roomName: string) {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET)
    throw new Error("LiveKit is not configured");
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: "patient",
    ttl: "2m",
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canSubscribe: true,
    canPublish: true,
    canPublishSources: [TrackSource.MICROPHONE],
    canPublishData: false,
    canUpdateOwnMetadata: false,
  });
  return { serverUrl: LIVEKIT_URL, token: await token.toJwt() };
}

function clients() {
  const {
    LIVEKIT_URL: url,
    LIVEKIT_API_KEY: key,
    LIVEKIT_API_SECRET: secret,
  } = process.env;
  if (!url || !key || !secret) throw new Error("LiveKit is not configured");
  const host = url.replace(/^ws/, "http");
  return {
    rooms: new RoomServiceClient(host, key, secret),
    agents: new AgentDispatchClient(host, key, secret),
  };
}

export async function closeConference(roomName: string): Promise<void> {
  const { rooms } = clients();
  const results = await Promise.allSettled([
    rooms.deleteRoom(roomName),
    rooms.deleteRoom(`${roomName}-invite`),
  ]);
  const failedRooms = results.filter(
    (result) =>
      result.status === "rejected" && result.reason?.code !== "not_found",
  ).length;
  if (failedRooms > 0)
    console.warn("LiveKit room cleanup incomplete", { roomName, failedRooms });
}

export async function patientIsPresent(roomName: string): Promise<boolean> {
  const { rooms } = clients();
  const participants = await rooms.listParticipants(roomName);
  return participants.some((participant) => participant.identity === "patient");
}

export async function dispatchConference(input: {
  actionId: string;
  roomName: string;
}): Promise<{ dispatchId: string }> {
  const { rooms, agents } = clients();
  try {
    await rooms.createRoom({
      name: input.roomName,
      maxParticipants: 3,
      emptyTimeout: 120,
      departureTimeout: 5,
    });
    const dispatch = await agents.createDispatch(
      input.roomName,
      "betterbill-patient-first",
      {
        metadata: JSON.stringify({
          ...input,
          flowVersion: CONFERENCE_FLOW_VERSION,
        }),
        // NEVER: a restarted worker must not redial an approved call.
        restartPolicy: JobRestartPolicy.JRP_NEVER,
      },
    );
    return { dispatchId: dispatch.id };
  } catch {
    await closeConference(input.roomName);
    throw new Error("Conference dispatch failed");
  }
}
