import os
import asyncio
from ably import AblyRealtime, AblyRest


class AblyManager:
    def __init__(self):
        self.ably_api_key = os.getenv('ABLY_API_KEY')
        self.ably_rest = AblyRest(self.ably_api_key) if self.ably_api_key else None
        self.ably_realtime = None
        self.channel = None
        self._connection_event = None

    async def initialize_realtime(self):
        """Initialize Ably Realtime connection."""
        if not self.ably_api_key:
            print("ABLY_API_KEY not found, cannot initialize Ably Realtime.")
            return

        try:
            self.ably_realtime = AblyRealtime(self.ably_api_key, client_id="thinkex-backend-server")
            print("Ably Realtime client created.")

            def on_state_change(state_change):
                if state_change.current == "connected":
                    print("Ably Realtime connected!")
                elif state_change.current == "failed":
                    print(f"Ably Realtime connection failed: {state_change.reason}")
                else:
                    print(f"Ably Realtime connection state: {state_change.current}")

            self.ably_realtime.connection.on(on_state_change)
            await self.ably_realtime.connection.once_async("connected")
            
            self.channel = self.ably_realtime.channels.get('knowledge-graph-updates')
            print("Ably channel ready for broadcasting")

        except Exception as e:
            print(f"Failed to initialize Ably Realtime client: {e}")

    def is_ready(self):
        return self.channel is not None

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients via Ably"""
        if not self.is_ready():
            print("Ably channel not available, skipping broadcast")
            return
        
        try:
            await self.channel.publish('server-update', message)
            print(f"Message broadcasted via Ably: {message.get('type', 'unknown')}")
        except Exception as e:
            print(f"Failed to broadcast message via Ably: {e}")

    async def close(self):
        """Close the Ably connection"""
        if self.ably_realtime:
            await self.ably_realtime.close()
            print("Ably connection closed")
