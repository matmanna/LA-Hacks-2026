import os

import aiohttp
from livekit import api
from livekit.agents import AgentServer, JobContext, cli

from .controller import CallController
from .protocol import parse_metadata

server = AgentServer(num_idle_processes=0, drain_timeout=620)


@server.rtc_session(agent_name="betterbill-patient-first")
async def entrypoint(ctx: JobContext) -> None:
    try:
        action_id, room_name = parse_metadata(ctx.job.metadata)
        if ctx.job.room.name != room_name:
            raise ValueError("Dispatch room mismatch")
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as http:
            async with api.LiveKitAPI(timeout=aiohttp.ClientTimeout(total=10)) as livekit:
                controller = CallController(ctx, http, livekit, action_id, room_name)
                ctx.add_shutdown_callback(controller.close)
                await controller.run()
    finally:
        ctx.shutdown("betterbill_voice_session_finished")


def main() -> None:
    # uv --env-file loads the chosen server-only environment before this entry point.
    required = (
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET",
        "ELEVENLABS_API_KEY",
        "BETTERBILL_VOICE_API_URL",
        "BB_VOICE_WORKER_KEY",
    )
    if not all(os.environ.get(key) for key in required):
        raise SystemExit("Missing worker configuration; see agents/voice-controller/README.md")
    cli.run_app(server)


if __name__ == "__main__":
    main()
