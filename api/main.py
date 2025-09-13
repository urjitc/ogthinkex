# main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import uuid4, UUID
from threading import Lock
from datetime import datetime
import json
import os
import asyncio
from ably import AblyRealtime, AblyRest

# -----------------------------
# 1) Data Models (Pydantic)
# -----------------------------
class QAPair(BaseModel):
    qa_id: str = Field(default_factory=lambda: str(uuid4()), alias='_id')
    question: str
    answer: str
    created_at: Optional[str] = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

class Cluster(BaseModel):
    title: str
    qas: List[QAPair] = Field(default_factory=list)

class ClusterList(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str  # e.g., "calculus"
    clusters: List[Cluster] = Field(default_factory=list)

class AddQARequest(BaseModel):
    cluster_list_id: str
    clusterName: str
    question: str
    answer: str

class AddQAResponse(BaseModel):
    message: str
    cluster: Cluster

class UpdateQARequest(BaseModel):
    cluster_list_id: str
    clusterName: str
    qa_id: str
    question: Optional[str] = None
    answer: Optional[str] = None

class UpdateQAResponse(BaseModel):
    message: str
    qa_pair: QAPair

# -----------------------------
# 2) App + CORS
# -----------------------------
app = FastAPI(
    title="ThinkEx Clusters API",
    description="Simple in-memory clusters for a single conversation (no graph_id).",
    version="1.0.0"
)

# Define allowed origins. Using a list is more explicit and less error-prone than regex.
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173", # Default for Vite
    "http://localhost:4322", # Astro dev server
    "http://localhost:4321", # Astro dev server
    "https://thinkex.netlify.app",
    "https://thinkex.onrender.com",
    "https://uninveighing-eve-flinchingly.ngrok-free.app", # Existing ngrok URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*--thinkex\.netlify\.app", # For Netlify deploy previews
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# 3) In-Memory Store (thread-safe) + Ably Management
# -----------------------------
lock = Lock()

# Ably connection management
class AblyManager:
    def __init__(self):
        self.ably_api_key = os.getenv('ABLY_API_KEY')
        self.ably_rest = AblyRest(self.ably_api_key) if self.ably_api_key else None
        self.ably_realtime = None
        self.channel = None
        self._connection_event = None

    async def initialize_realtime(self):
        """Initialize Ably Realtime connection using async with pattern"""
        if not self.ably_api_key:
            print("ABLY_API_KEY not found, cannot initialize Ably Realtime.")
            return False

        try:
            # Initialize the Ably Realtime client using async with
            async with AblyRealtime(self.ably_api_key, client_id="thinkex-backend-server") as ably_realtime:
                self.ably_realtime = ably_realtime
                
                # Set up connection state listener
                def on_state_change(state_change):
                    if state_change.current.value == "connected":
                        print("Ably Realtime connected!")
                    elif state_change.current.value == "failed":
                        print(f"Ably Realtime connection failed: {state_change.reason}")
                    else:
                        print(f"Ably Realtime connection state: {state_change.current.value}")
                
                ably_realtime.connection.on(on_state_change)
                await ably_realtime.connection.once_async("connected")
                self.channel = ably_realtime.channels.get('knowledge-graph-updates')
                print("Ably channel ready for broadcasting")
                
                # Keep connection alive using asyncio.Event()
                self._connection_event = asyncio.Event()
                await self._connection_event.wait()
                
        except Exception as e:
            print(f"Failed to initialize Ably Realtime client: {e}")
            return False
        
        return True

    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients via Ably"""
        if not self.channel:
            print("Ably channel not available, skipping broadcast")
            return
        
        try:
            await self.channel.publish('server-update', message)
            print(f"Message broadcasted via Ably: {message.get('type', 'unknown')}")
        except Exception as e:
            print(f"Failed to broadcast message via Ably: {e}")

    async def close(self):
        """Signal to close the Ably connection"""
        if self._connection_event:
            self._connection_event.set()
            print("Ably connection close signal sent")

# Global manager instance
manager = None
ably_task = None

# FastAPI lifecycle events
@app.on_event("startup")
async def startup_event():
    """Initialize Ably clients on startup"""
    global manager, ably_task
    print("Starting up FastAPI application...")
    
    manager = AblyManager()
    if manager.ably_rest:
        print("Ably REST client initialized for token requests.")
    else:
        print("ABLY_API_KEY not found. Ably REST client not initialized.")

    # Start Ably Realtime connection as a background task
    ably_task = asyncio.create_task(manager.initialize_realtime())
    
    # Give it a moment to establish connection
    await asyncio.sleep(2) # Increased sleep to allow for connection
    
    if manager.channel:
        print("Ably Realtime connection ready for broadcasting.")
    else:
        print("Ably Realtime connection not available.")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up Ably connection on shutdown"""
    global manager, ably_task
    print("Shutting down FastAPI application...")
    
    if manager:
        await manager.close()
    
    if ably_task and not ably_task.done():
        ably_task.cancel()
        try:
            await ably_task
        except asyncio.CancelledError:
            pass
    
    print("Ably connection cleanup completed")

# Mock data per your spec:
# - One ClusterList titled "calculus"
# - Clusters are integration topics
# DATA = ClusterList(
#     title="Calculus",
#     clusters=[
#         Cluster(
#             title="Substitution",
#             qas=[
#                 QAPair(
#                     question="How do I recognize when to use u-substitution?",
#                     answer="Look for a composite f(g(x)) where g'(x) appears elsewhere (up to a constant factor)."
#                 ),
#                 QAPair(
#                     question="What if the derivative isn’t an exact match?",
#                     answer="Factor out constants or rewrite the integrand; if only a constant is missing, multiply/divide by it."
#                 ),
#                 QAPair(
#                     question="Common patterns for substitution?",
#                     answer="Roots like √(ax+b), exponentials e^{ax+b}, logarithms ln(ax+b), and products f(g(x))·g'(x)."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Integration by Parts",
#             qas=[
#                 QAPair(
#                     question="What is the integration by parts formula?",
#                     answer="∫u dv = uv − ∫v du; pick u via LIATE/ILATE when unsure."
#                 ),
#                 QAPair(
#                     question="When does tabular (DI) method help?",
#                     answer="When u differentiates to 0 in a few steps (polynomials) and dv integrates repeatedly (e^x, sin, cos)."
#                 ),
#                 QAPair(
#                     question="Classic targets for choosing u?",
#                     answer="ln x, arctan x, algebraic factors with exponent ≥ 1."
#                 ),
#                 QAPair(
#                     question="What about ∫e^{ax}cos(bx) dx?",
#                     answer="Apply IBP twice or use the standard result: ∫e^{ax}cos(bx)dx = e^{ax}(a cos bx + b sin bx)/(a^2+b^2)+C."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Partial Fractions",
#             qas=[
#                 QAPair(
#                     question="When can I use partial fractions?",
#                     answer="For rational functions P/Q with deg P < deg Q and Q factorable over ℝ; do long division if deg P ≥ deg Q."
#                 ),
#                 QAPair(
#                     question="How do I handle repeated linear factors?",
#                     answer="Include terms A1/(x−r) + A2/(x−r)^2 + … up to the multiplicity."
#                 ),
#                 QAPair(
#                     question="What about irreducible quadratics?",
#                     answer="Use (Ax+B)/(ax^2+bx+c) for each irreducible quadratic factor."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Trigonometric Integrals",
#             qas=[
#                 QAPair(
#                     question="How to approach ∫sin^m x cos^n x dx?",
#                     answer="If one exponent is odd, peel one factor and use sin^2+cos^2=1 to convert the rest."
#                 ),
#                 QAPair(
#                     question="Strategy for ∫tan^m x sec^n x dx?",
#                     answer="If n is even, peel sec^2; if m is odd, peel sec·tan and convert using sec^2=1+tan^2."
#                 ),
#                 QAPair(
#                     question="Power-reduction identities useful when?",
#                     answer="When both exponents are even; convert with cos^2=(1+cos2x)/2, sin^2=(1−cos2x)/2."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Trigonometric Substitution",
#             qas=[
#                 QAPair(
#                     question="Which substitution for √(a^2 − x^2)?",
#                     answer="x = a sin θ, dx = a cos θ dθ, and use 1−sin^2θ=cos^2θ."
#                 ),
#                 QAPair(
#                     question="Which substitution for √(a^2 + x^2)?",
#                     answer="x = a tan θ, dx = a sec^2 θ dθ, and 1+tan^2θ=sec^2θ."
#                 ),
#                 QAPair(
#                     question="Which substitution for √(x^2 − a^2)?",
#                     answer="x = a sec θ, dx = a sec θ tan θ dθ, and sec^2θ−1=tan^2θ."
#                 ),
#                 QAPair(
#                     question="How do I back-substitute cleanly?",
#                     answer="Draw a reference triangle from the substitution to express sinθ, cosθ, tanθ in terms of x and a."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Improper Integrals",
#             qas=[
#                 QAPair(
#                     question="How do I test convergence of ∫_1^∞ 1/x^p dx?",
#                     answer="Converges iff p>1; diverges otherwise (p-test)."
#                 ),
#                 QAPair(
#                     question="What about ∫_0^1 x^{−p} dx?",
#                     answer="Converges iff p<1; diverges otherwise."
#                 ),
#                 QAPair(
#                     question="When to use comparison vs limit comparison?",
#                     answer="Use direct comparison with clear inequalities; use limit comparison when functions are asymptotically proportional."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Reduction Formulas",
#             qas=[
#                 QAPair(
#                     question="What is a reduction formula?",
#                     answer="A recurrence expressing ∫f_n in terms of ∫f_{n−1} (e.g., ∫sin^n x dx)."
#                 ),
#                 QAPair(
#                     question="Example for sin^n x?",
#                     answer="∫sin^n x dx = −(sin^{n−1}x cos x)/n + ((n−1)/n)∫sin^{n−2}x dx."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Numerical Integration",
#             qas=[
#                 QAPair(
#                     question="When to use Trapezoidal vs Simpson’s?",
#                     answer="Trapezoidal is O(h^2) and simple; Simpson’s is O(h^4) but needs an even number of subintervals and smooth f."
#                 ),
#                 QAPair(
#                     question="How to control error quickly?",
#                     answer="Halve h and compare results; Richardson extrapolation can accelerate convergence."
#                 )
#             ]
#         ),
#         Cluster(
#             title="Integration Strategy",
#             qas=[
#                 QAPair(
#                     question="What’s a good general checklist?",
#                     answer="Simplify → try substitution → trig identities → parts → partial fractions → trig sub → numeric if needed."
#                 ),
#                 QAPair(
#                     question="Quick algebraic rewrites that help?",
#                     answer="Split sums, factor constants, complete the square, rationalize, or rewrite powers with identities."
#                 )
#             ]
#         )
#     ]
# )
# In-memory store for multiple cluster lists, keyed by their ID.
CLUSTER_LISTS: dict[str, ClusterList] = {}

# Create a default cluster list on startup for simplicity.
def _create_default_cluster_list():
    default_list = ClusterList(title="Knowledge Base")
    CLUSTER_LISTS[default_list.id] = default_list
    print(f"Created default cluster list with ID: {default_list.id}")

_create_default_cluster_list()

def _find_cluster_idx_case_insensitive(cluster_list: ClusterList, name: str) -> Optional[int]:
    name_norm = name.strip().lower()
    for i, c in enumerate(cluster_list.clusters):
        if c.title.strip().lower() == name_norm:
            return i
    return None

# -----------------------------
# 4) Endpoints for GPT Actions
# -----------------------------

@app.get("/ably-token-request")
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

class CreateClusterListRequest(BaseModel):
    title: str

@app.post("/cluster-lists", response_model=ClusterList, operation_id="create_cluster_list")
def create_cluster_list(payload: CreateClusterListRequest):
    """
    create_cluster_list(title) -> creates a new, empty cluster list.
    """
    with lock:
        new_list = ClusterList(title=payload.title)
        CLUSTER_LISTS[new_list.id] = new_list
        return new_list

@app.get("/cluster-lists", response_model=List[ClusterList], operation_id="get_all_cluster_lists")
def get_all_cluster_lists():
    """
    get_all_cluster_lists() -> returns all cluster lists.
    """
    with lock:
        return list(CLUSTER_LISTS.values())

@app.get(
    "/cluster-lists/{cluster_list_id}", 
    response_model=ClusterList, 
    operation_id="get_cluster_list_by_id",
)
def get_cluster_list_by_id(cluster_list_id: str):
    """
    get_cluster_list_by_id() -> returns a specific ClusterList by its ID
    """
    with lock:
        if cluster_list_id not in CLUSTER_LISTS:
            raise HTTPException(status_code=404, detail=f"ClusterList with id '{cluster_list_id}' not found.")
        return CLUSTER_LISTS[cluster_list_id]

# For backward compatibility with the current frontend, which expects /clusters
@app.get(
    "/clusters", 
    response_model=ClusterList, 
    operation_id="get_clusters",
)
def get_clusters():
    """
    get_clusters() -> returns the *first* ClusterList for backward compatibility.
    """
    with lock:
        if not CLUSTER_LISTS:
            raise HTTPException(status_code=404, detail="No cluster lists found.")
        # Return the first one found
        return next(iter(CLUSTER_LISTS.values()))

@app.post("/update_qa", response_model=UpdateQAResponse, operation_id="update_qa")
async def update_qa(payload: UpdateQARequest):
    """
    update_qa(cluster_list_id, clusterName, qa_id, question, answer) -> updates a Q/A in the named cluster.
    At least one of question or answer must be provided.
    """
    if not payload.cluster_list_id:
        raise HTTPException(status_code=400, detail="cluster_list_id must be provided")

    with lock:
        if payload.cluster_list_id not in CLUSTER_LISTS:
            raise HTTPException(status_code=404, detail=f"ClusterList with id '{payload.cluster_list_id}' not found.")
        cluster_list = CLUSTER_LISTS[payload.cluster_list_id]

    cluster_name = payload.clusterName.strip()
    if not cluster_name:
        raise HTTPException(status_code=400, detail="clusterName must be non-empty")
    if not payload.qa_id:
        raise HTTPException(status_code=400, detail="qa_id must be non-empty")
    if payload.question is None and payload.answer is None:
        raise HTTPException(status_code=400, detail="At least one of 'question' or 'answer' must be provided for an update.")

    with lock:
        cluster_idx = _find_cluster_idx_case_insensitive(cluster_list, cluster_name)
        if cluster_idx is None:
            raise HTTPException(status_code=404, detail=f"Cluster '{cluster_name}' not found in list '{cluster_list.id}'.")

        cluster = cluster_list.clusters[cluster_idx]
        qa_to_update = None
        qa_idx = -1

        for i, qa in enumerate(cluster.qas):
            if qa.qa_id == payload.qa_id:
                qa_to_update = qa
                qa_idx = i
                break
        
        if qa_to_update is None:
            raise HTTPException(status_code=404, detail=f"Q/A with id '{payload.qa_id}' not found in cluster '{cluster_name}'.")

        updated = False
        if payload.question is not None and payload.question.strip() and payload.question.strip() != qa_to_update.question:
            qa_to_update.question = payload.question.strip()
            updated = True
        
        if payload.answer is not None and payload.answer.strip() and payload.answer.strip() != qa_to_update.answer:
            qa_to_update.answer = payload.answer.strip()
            updated = True

        if not updated:
            return UpdateQAResponse(
                message="No changes detected.",
                qa_pair=qa_to_update
            )

        cluster_list.clusters[cluster_idx].qas[qa_idx] = qa_to_update

        await manager.broadcast({
            "type": "knowledge_graph_update",
            "action": "qa_updated",
            "payload": {
                "cluster_list_id": cluster_list.id,
                "clusterName": cluster.title,
                "qa_pair": qa_to_update.dict(),
                "message": f'Updated Q/A in cluster "{cluster.title}".'
            }
        })

        return UpdateQAResponse(
            message=f'Updated Q/A in cluster "{cluster.title}".',
            qa_pair=qa_to_update
        )
    """
    update_qa(clusterName, qa_id, question, answer) -> updates a Q/A in the named cluster.
    At least one of question or answer must be provided.
    """
    cluster_name = payload.clusterName.strip()
    if not cluster_name:
        raise HTTPException(status_code=400, detail="clusterName must be non-empty")
    if not payload.qa_id:
        raise HTTPException(status_code=400, detail="qa_id must be non-empty")
    if payload.question is None and payload.answer is None:
        raise HTTPException(status_code=400, detail="At least one of 'question' or 'answer' must be provided for an update.")

    with lock:
        cluster_idx = _find_cluster_idx_case_insensitive(cluster_name)
        if cluster_idx is None:
            raise HTTPException(status_code=404, detail=f"Cluster '{cluster_name}' not found.")

        cluster = DATA.clusters[cluster_idx]
        qa_to_update = None
        qa_idx = -1

        for i, qa in enumerate(cluster.qas):
            if qa.qa_id == payload.qa_id:
                qa_to_update = qa
                qa_idx = i
                break
        
        if qa_to_update is None:
            raise HTTPException(status_code=404, detail=f"Q/A with id '{payload.qa_id}' not found in cluster '{cluster_name}'.")

        updated = False
        if payload.question is not None and payload.question.strip() and payload.question.strip() != qa_to_update.question:
            qa_to_update.question = payload.question.strip()
            updated = True
        
        if payload.answer is not None and payload.answer.strip() and payload.answer.strip() != qa_to_update.answer:
            qa_to_update.answer = payload.answer.strip()
            updated = True

        if not updated:
            return UpdateQAResponse(
                message="No changes detected.",
                qa_pair=qa_to_update
            )

        DATA.clusters[cluster_idx].qas[qa_idx] = qa_to_update

        await manager.broadcast({
            "type": "knowledge_graph_update",
            "action": "qa_updated",
            "payload": {
                "clusterName": cluster.title,
                "qa_pair": qa_to_update.dict(),
                "message": f'Updated Q/A in cluster "{cluster.title}".'
            }
        })

        return UpdateQAResponse(
            message=f'Updated Q/A in cluster "{cluster.title}".',
            qa_pair=qa_to_update
        )

@app.post("/add_qa", response_model=AddQAResponse, operation_id="add_qa")
async def add_qa(payload: AddQARequest):
    """
    add_qa(cluster_list_id, clusterName, question, answer) -> adds a Q/A to the named cluster.
    If the cluster doesn't exist, it will be created.
    """
    if not payload.cluster_list_id:
        raise HTTPException(status_code=400, detail="cluster_list_id must be provided")

    with lock:
        if payload.cluster_list_id not in CLUSTER_LISTS:
            raise HTTPException(status_code=404, detail=f"ClusterList with id '{payload.cluster_list_id}' not found.")
        cluster_list = CLUSTER_LISTS[payload.cluster_list_id]

    cluster_name = payload.clusterName.strip()
    if not cluster_name:
        raise HTTPException(status_code=400, detail="clusterName must be non-empty")
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="question must be non-empty")
    if not payload.answer.strip():
        raise HTTPException(status_code=400, detail="answer must be non-empty")

    with lock:
        idx = _find_cluster_idx_case_insensitive(cluster_list, cluster_name)
        qa = QAPair(question=payload.question.strip(), answer=payload.answer.strip())

        if idx is None:
            # create new cluster
            new_cluster = Cluster(title=cluster_name, qas=[qa])
            cluster_list.clusters.append(new_cluster)
            
            # Broadcast the update to all connected clients
            await manager.broadcast({
                "type": "knowledge_graph_update",
                "action": "cluster_created",
                "payload": {
                    "cluster_list_id": cluster_list.id,
                    "cluster": new_cluster.dict(),
                    "message": f'Created cluster "{new_cluster.title}" and added Q/A.'
                }
            })
            
            return AddQAResponse(
                message=f'Created cluster "{new_cluster.title}" and added Q/A.',
                cluster=new_cluster
            )
        else:
            # append to existing cluster
            cluster_list.clusters[idx].qas.append(qa)
            
            # Broadcast the update to all connected clients
            await manager.broadcast({
                "type": "knowledge_graph_update",
                "action": "qa_added",
                "payload": {
                    "cluster_list_id": cluster_list.id,
                    "cluster": cluster_list.clusters[idx].dict(),
                    "new_qa": qa.dict(),
                    "message": f'Added Q/A to cluster "{cluster_list.clusters[idx].title}".'
                }
            })
            
            return AddQAResponse(
                message=f'Added Q/A to cluster "{cluster_list.clusters[idx].title}".',
                cluster=cluster_list.clusters[idx]
            )
    """
    add_qa(clusterName, question, answer) -> adds a Q/A to the named cluster.
    If the cluster doesn't exist, it will be created.
    """
    cluster_name = payload.clusterName.strip()
    if not cluster_name:
        raise HTTPException(status_code=400, detail="clusterName must be non-empty")
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="question must be non-empty")
    if not payload.answer.strip():
        raise HTTPException(status_code=400, detail="answer must be non-empty")

    with lock:
        idx = _find_cluster_idx_case_insensitive(cluster_name)
        qa = QAPair(question=payload.question.strip(), answer=payload.answer.strip())

        if idx is None:
            # create new cluster
            new_cluster = Cluster(title=cluster_name, qas=[qa])
            DATA.clusters.append(new_cluster)
            
            # Broadcast the update to all connected clients
            await manager.broadcast({
                "type": "knowledge_graph_update",
                "action": "cluster_created",
                "payload": {
                    "cluster": new_cluster.dict(),
                    "message": f'Created cluster "{new_cluster.title}" and added Q/A.'
                }
            })
            
            return AddQAResponse(
                message=f'Created cluster "{new_cluster.title}" and added Q/A.',
                cluster=new_cluster
            )
        else:
            # append to existing cluster
            DATA.clusters[idx].qas.append(qa)
            
            # Broadcast the update to all connected clients
            await manager.broadcast({
                "type": "knowledge_graph_update",
                "action": "qa_added",
                "payload": {
                    "cluster": DATA.clusters[idx].dict(),
                    "new_qa": qa.dict(),
                    "message": f'Added Q/A to cluster "{DATA.clusters[idx].title}".'
                }
            })
            
            return AddQAResponse(
                message=f'Added Q/A to cluster "{DATA.clusters[idx].title}".',
                cluster=DATA.clusters[idx]
            )

# WebSocket endpoint removed - now using Ably for real-time communication


class DeleteQAResponse(BaseModel):
    message: str
    qa_id: str
    clusterName: str

class DeleteClusterResponse(BaseModel):
    message: str
    clusterName: str

@app.delete("/qa/{qa_id}", response_model=DeleteQAResponse, operation_id="delete_qa")
async def delete_qa(qa_id: str, clusterName: str, cluster_list_id: str):
    """
    delete_qa(qa_id, clusterName, cluster_list_id) -> deletes a Q/A from the named cluster.
    """
    if not cluster_list_id:
        raise HTTPException(status_code=400, detail="cluster_list_id must be provided")

    with lock:
        if cluster_list_id not in CLUSTER_LISTS:
            raise HTTPException(status_code=404, detail=f"ClusterList with id '{cluster_list_id}' not found.")
        cluster_list = CLUSTER_LISTS[cluster_list_id]

    cluster_name = clusterName.strip()
    if not cluster_name:
        raise HTTPException(status_code=400, detail="clusterName must be non-empty")

    with lock:
        cluster_idx = _find_cluster_idx_case_insensitive(cluster_list, cluster_name)
        if cluster_idx is None:
            raise HTTPException(status_code=404, detail=f"Cluster '{cluster_name}' not found.")

        cluster = cluster_list.clusters[cluster_idx]
        qa_to_delete_idx = -1
        for i, qa in enumerate(cluster.qas):
            if qa.qa_id == qa_id:
                qa_to_delete_idx = i
                break
        
        if qa_to_delete_idx == -1:
            raise HTTPException(status_code=404, detail=f"Q/A with id '{qa_id}' not found in cluster '{cluster_name}'.")

        del cluster.qas[qa_to_delete_idx]

        await manager.broadcast({
            "type": "knowledge_graph_update",
            "action": "qa_deleted",
            "payload": {
                "cluster_list_id": cluster_list.id,
                "qa_id": qa_id,
                "clusterName": cluster.title,
                "message": f'Deleted Q/A from cluster "{cluster.title}".'
            }
        })

        return DeleteQAResponse(
            message=f'Deleted Q/A from cluster "{cluster.title}".',
            qa_id=qa_id,
            clusterName=cluster.title
        )
    """
    delete_qa(qa_id, clusterName) -> deletes a Q/A from the named cluster.
    """
    cluster_name = clusterName.strip()
    if not cluster_name:
        raise HTTPException(status_code=400, detail="clusterName must be non-empty")

    with lock:
        cluster_idx = _find_cluster_idx_case_insensitive(cluster_name)
        if cluster_idx is None:
            raise HTTPException(status_code=404, detail=f"Cluster '{cluster_name}' not found.")

        cluster = DATA.clusters[cluster_idx]
        qa_to_delete_idx = -1
        for i, qa in enumerate(cluster.qas):
            if qa.qa_id == qa_id:
                qa_to_delete_idx = i
                break
        
        if qa_to_delete_idx == -1:
            raise HTTPException(status_code=404, detail=f"Q/A with id '{qa_id}' not found in cluster '{cluster_name}'.")

        del cluster.qas[qa_to_delete_idx]

        await manager.broadcast({
            "type": "knowledge_graph_update",
            "action": "qa_deleted",
            "payload": {
                "qa_id": qa_id,
                "clusterName": cluster.title,
                "message": f'Deleted Q/A from cluster "{cluster.title}".'
            }
        })

        return DeleteQAResponse(
            message=f'Deleted Q/A from cluster "{cluster.title}".',
            qa_id=qa_id,
            clusterName=cluster.title
        )

@app.delete("/cluster/{cluster_name}", response_model=DeleteClusterResponse, operation_id="delete_cluster")
async def delete_cluster(cluster_name: str, cluster_list_id: str):
    """
    delete_cluster(cluster_name, cluster_list_id) -> deletes a cluster and all its Q/As.
    """
    if not cluster_list_id:
        raise HTTPException(status_code=400, detail="cluster_list_id must be provided")

    with lock:
        if cluster_list_id not in CLUSTER_LISTS:
            raise HTTPException(status_code=404, detail=f"ClusterList with id '{cluster_list_id}' not found.")
        cluster_list = CLUSTER_LISTS[cluster_list_id]

    cluster_name_stripped = cluster_name.strip()
    if not cluster_name_stripped:
        raise HTTPException(status_code=400, detail="cluster_name must be non-empty")

    with lock:
        cluster_idx = _find_cluster_idx_case_insensitive(cluster_list, cluster_name_stripped)
        if cluster_idx is None:
            raise HTTPException(status_code=404, detail=f"Cluster '{cluster_name_stripped}' not found.")

        deleted_cluster_title = cluster_list.clusters[cluster_idx].title
        del cluster_list.clusters[cluster_idx]

        await manager.broadcast({
            "type": "knowledge_graph_update",
            "action": "cluster_deleted",
            "payload": {
                "cluster_list_id": cluster_list.id,
                "clusterName": deleted_cluster_title,
                "message": f'Deleted cluster "{deleted_cluster_title}".'
            }
        })

        return DeleteClusterResponse(
            message=f'Deleted cluster "{deleted_cluster_title}".',
            clusterName=deleted_cluster_title
        )
    """
    delete_cluster(cluster_name) -> deletes a cluster and all its Q/As.
    """
    cluster_name_stripped = cluster_name.strip()
    if not cluster_name_stripped:
        raise HTTPException(status_code=400, detail="cluster_name must be non-empty")

    with lock:
        cluster_idx = _find_cluster_idx_case_insensitive(cluster_name_stripped)
        if cluster_idx is None:
            raise HTTPException(status_code=404, detail=f"Cluster '{cluster_name_stripped}' not found.")

        deleted_cluster_title = DATA.clusters[cluster_idx].title
        del DATA.clusters[cluster_idx]

        await manager.broadcast({
            "type": "knowledge_graph_update",
            "action": "cluster_deleted",
            "payload": {
                "clusterName": deleted_cluster_title,
                "message": f'Deleted cluster "{deleted_cluster_title}".'
            }
        })

        return DeleteClusterResponse(
            message=f'Deleted cluster "{deleted_cluster_title}".',
            clusterName=deleted_cluster_title
        )

# -----------------------------
# 5) Health + Root (optional)
# -----------------------------
@app.get("/", tags=["meta"])
def root():
    with lock:
        # For the root, we can just return the count of lists.
        return {"status": "ok", "cluster_list_count": len(CLUSTER_LISTS)}
