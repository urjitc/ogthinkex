# main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
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
    graph_id: str = Field(default_factory=lambda: str(uuid4()))
    title: str  # e.g., "calculus"
    clusters: List[Cluster] = Field(default_factory=list)

class AddQARequest(BaseModel):
    clusterName: str
    question: str
    answer: str

class CreateKnowledgeGraphRequest(BaseModel):
    title: str

class KnowledgeGraphInfo(BaseModel):
    graph_id: str
    title: str

class AddQAResponse(BaseModel):
    message: str
    cluster: Cluster

class UpdateQARequest(BaseModel):
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
KNOWLEDGE_GRAPHS: dict[str, ClusterList] = {}
DEFAULT_GRAPH_ID = "default_graph"

def initialize_data():
    """Set up the initial default knowledge graph."""
    if DEFAULT_GRAPH_ID not in KNOWLEDGE_GRAPHS:
        KNOWLEDGE_GRAPHS[DEFAULT_GRAPH_ID] = ClusterList(graph_id=DEFAULT_GRAPH_ID, title="Base", clusters=[])

@app.on_event("startup")
async def startup_event_data():
    initialize_data()

def _find_cluster_idx_case_insensitive(graph_id: str, name: str) -> Optional[int]:
    name_norm = name.strip().lower()
    graph = KNOWLEDGE_GRAPHS.get(graph_id)
    if not graph:
        return None
    for i, c in enumerate(graph.clusters):
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

@app.get("/knowledge-graphs/info", response_model=List[KnowledgeGraphInfo], operation_id="get_all_knowledge_graph_info")
def get_all_knowledge_graph_info():
    """
    get_all_knowledge_graph_info() -> returns a list of all knowledge graphs with their IDs and titles.
    """
    with lock:
        return [KnowledgeGraphInfo(graph_id=graph.graph_id, title=graph.title) for graph in KNOWLEDGE_GRAPHS.values()]

@app.get("/knowledge-graphs", response_model=List[ClusterList], operation_id="get_all_knowledge_graphs")
def get_all_knowledge_graphs():
    """
    get_all_knowledge_graphs() -> returns a list of all knowledge graphs.
    """
    with lock:
        return list(KNOWLEDGE_GRAPHS.values())


@app.post("/knowledge-graphs", response_model=ClusterList, operation_id="create_knowledge_graph")
def create_knowledge_graph(payload: CreateKnowledgeGraphRequest):
    """
    create_knowledge_graph(title) -> creates a new knowledge graph.
    """
    with lock:
        new_graph = ClusterList(title=payload.title)
        KNOWLEDGE_GRAPHS[new_graph.graph_id] = new_graph
        return new_graph

@app.get(
    "/knowledge-graphs/{graph_id}/clusters", 
    response_model=ClusterList, 
    operation_id="get_clusters",
)
def get_clusters(graph_id: str):
    """
    get_clusters(graph_id) -> returns the specified ClusterList
    """
    with lock:
        graph = KNOWLEDGE_GRAPHS.get(graph_id)
        if not graph:
            raise HTTPException(status_code=404, detail=f"Knowledge graph with id '{graph_id}' not found.")
        return graph

@app.post("/knowledge-graphs/{graph_id}/update_qa", response_model=UpdateQAResponse, operation_id="update_qa")
async def update_qa(graph_id: str, payload: UpdateQARequest):
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
        graph = KNOWLEDGE_GRAPHS.get(graph_id)
        if not graph:
            raise HTTPException(status_code=404, detail=f"Knowledge graph with id '{graph_id}' not found.")

        cluster_idx = _find_cluster_idx_case_insensitive(graph_id, cluster_name)
        if cluster_idx is None:
            raise HTTPException(status_code=404, detail=f"Cluster '{cluster_name}' not found.")

        cluster = graph.clusters[cluster_idx]
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

        graph.clusters[cluster_idx].qas[qa_idx] = qa_to_update

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

@app.post("/knowledge-graphs/{graph_id}/add_qa", response_model=AddQAResponse, operation_id="add_qa")
async def add_qa(graph_id: str, payload: AddQARequest):
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
        graph = KNOWLEDGE_GRAPHS.get(graph_id)
        if not graph:
            raise HTTPException(status_code=404, detail=f"Knowledge graph with id '{graph_id}' not found.")

        idx = _find_cluster_idx_case_insensitive(graph_id, cluster_name)
        qa = QAPair(question=payload.question.strip(), answer=payload.answer.strip())

        if idx is None:
            # create new cluster
            new_cluster = Cluster(title=cluster_name, qas=[qa])
            graph.clusters.append(new_cluster)
            
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
            graph.clusters[idx].qas.append(qa)
            
            # Broadcast the update to all connected clients
            await manager.broadcast({
                "type": "knowledge_graph_update",
                "action": "qa_added",
                "payload": {
                    "cluster": graph.clusters[idx].dict(),
                    "new_qa": qa.dict(),
                    "message": f'Added Q/A to cluster "{graph.clusters[idx].title}".'
                }
            })
            
            return AddQAResponse(
                message=f'Added Q/A to cluster "{graph.clusters[idx].title}".',
                cluster=graph.clusters[idx]
            )

# WebSocket endpoint removed - now using Ably for real-time communication


class DeleteQAResponse(BaseModel):
    message: str
    qa_id: str
    clusterName: str

class DeleteClusterResponse(BaseModel):
    message: str
    clusterName: str

@app.delete("/knowledge-graphs/{graph_id}/qa/{qa_id}", response_model=DeleteQAResponse, operation_id="delete_qa")
async def delete_qa(graph_id: str, qa_id: str, clusterName: str):
    """
    delete_qa(qa_id, clusterName) -> deletes a Q/A from the named cluster.
    """
    cluster_name = clusterName.strip()
    if not cluster_name:
        raise HTTPException(status_code=400, detail="clusterName must be non-empty")

    with lock:
        graph = KNOWLEDGE_GRAPHS.get(graph_id)
        if not graph:
            raise HTTPException(status_code=404, detail=f"Knowledge graph with id '{graph_id}' not found.")

        cluster_idx = _find_cluster_idx_case_insensitive(graph_id, cluster_name)
        if cluster_idx is None:
            raise HTTPException(status_code=404, detail=f"Cluster '{cluster_name}' not found.")

        cluster = graph.clusters[cluster_idx]
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

@app.delete("/knowledge-graphs/{graph_id}/cluster/{cluster_name}", response_model=DeleteClusterResponse, operation_id="delete_cluster")
async def delete_cluster(graph_id: str, cluster_name: str):
    """
    delete_cluster(cluster_name) -> deletes a cluster and all its Q/As.
    """
    cluster_name_stripped = cluster_name.strip()
    if not cluster_name_stripped:
        raise HTTPException(status_code=400, detail="cluster_name must be non-empty")

    with lock:
        cluster_idx = _find_cluster_idx_case_insensitive(graph_id, cluster_name_stripped)
        if cluster_idx is None:
            raise HTTPException(status_code=404, detail=f"Cluster '{cluster_name_stripped}' not found.")

        graph = KNOWLEDGE_GRAPHS.get(graph_id)
        if not graph:
            raise HTTPException(status_code=404, detail=f"Knowledge graph with id '{graph_id}' not found.")

        deleted_cluster_title = graph.clusters[cluster_idx].title
        del graph.clusters[cluster_idx]

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
        return {"status": "ok", "knowledge_graphs_count": len(KNOWLEDGE_GRAPHS)}
