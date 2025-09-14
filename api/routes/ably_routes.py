from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime
from services.ably_manager import AblyManager

router = APIRouter()

# Global manager instance - will be set in main.py
manager: Optional[AblyManager] = None


def set_ably_manager(ably_manager: AblyManager):
    """Set the global Ably manager instance"""
    global manager
    manager = ably_manager


@router.get("/ably-token-request")
async def ably_token_request(clientId: Optional[str] = Query(None)):
    """
    Generate Ably token for secure client authentication
    """
    print("=== ABLY TOKEN REQUEST START ===")
    print(f"Received clientId parameter: {clientId}")

    if not manager or not manager.ably_rest:
        raise HTTPException(
            status_code=500, 
            detail="Ably REST client not initialized. Check ABLY_API_KEY."
        )

    # Generate client ID
    client_id = clientId or f"thinkex-client-{datetime.utcnow().timestamp()}"
    print(f"Using client_id: {client_id}")
    
    try:
        # Create token request with proper parameters as per Ably docs
        token_request_params = {
            'clientId': client_id,
            'capability': {'*': ['*']},  # Full access for now
            'ttl': 3600 * 1000  # 1 hour in milliseconds
        }
        
        print("Calling create_token_request using shared client...")
        # Use the shared AblyRest client from the manager
        token_request = await manager.ably_rest.auth.create_token_request(token_request_params)

        # Manually construct a dictionary to avoid Python's name mangling in the JSON response.
        # The Ably JS client expects keys like 'keyName', not '_TokenRequest__key_name'.
        response_data = {
            "keyName": token_request.key_name,
            "clientId": token_request.client_id,
            "nonce": token_request.nonce,
            "mac": token_request.mac,
            "capability": token_request.capability,
            "ttl": token_request.ttl,
            "timestamp": token_request.timestamp
        }

        print(f"Token request created successfully. Returning JSON: {response_data}")
        print("=== ABLY TOKEN REQUEST SUCCESS ===")
        return response_data
    except ImportError as e:
        print(f"Import error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ably import error: {str(e)}")
    except AttributeError as e:
        print(f"Attribute error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ably attribute error: {str(e)}")
    except Exception as e:
        print(f"General error type: {type(e)}")
        print(f"General error message: {str(e)}")
        print(f"General error args: {e.args}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate Ably token: {str(e)}")
