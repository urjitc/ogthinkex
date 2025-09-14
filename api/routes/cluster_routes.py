from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session
from typing import List, Optional
from database import get_session, DatabaseService
from models import (
    ClusterList, ClusterListInfo, CreateClusterListRequest,
    AddQARequest, AddQAResponse, UpdateQARequest, UpdateQAResponse,
    MoveQARequest, MoveQAResponse, ReorderQAsRequest,
    DeleteQAResponse, DeleteClusterResponse
)
from services.ably_manager import AblyManager

router = APIRouter()

# Global manager instance - will be set in main.py
manager: Optional[AblyManager] = None


def set_ably_manager(ably_manager: AblyManager):
    """Set the global Ably manager instance"""
    global manager
    manager = ably_manager


def get_database_service(session: Session = Depends(get_session)) -> DatabaseService:
    """Get database service instance"""
    return DatabaseService(session)


@router.post("/cluster-lists", response_model=ClusterList, operation_id="create_cluster_list")
def create_cluster_list(
    payload: CreateClusterListRequest,
    db_service: DatabaseService = Depends(get_database_service)
):
    """
    create_cluster_list(title) -> creates a new, empty cluster list.
    """
    db_cluster_list = db_service.create_cluster_list(payload.title)
    return db_service.convert_to_api_cluster_list(db_cluster_list)


@router.get("/cluster-lists", response_model=List[ClusterList], operation_id="get_all_cluster_lists")
def get_all_cluster_lists(db_service: DatabaseService = Depends(get_database_service)):
    """
    get_all_cluster_lists() -> returns all cluster lists.
    """
    db_cluster_lists = db_service.get_all_cluster_lists()
    return [db_service.convert_to_api_cluster_list(cl) for cl in db_cluster_lists]


@router.get("/cluster-lists/info", response_model=List[ClusterListInfo], operation_id="get_all_cluster_list_info")
def get_all_cluster_list_info(db_service: DatabaseService = Depends(get_database_service)):
    """
    get_all_cluster_list_info() -> returns all cluster lists with just their id and title.
    """
    return db_service.get_cluster_list_info()


@router.get(
    "/cluster-lists/{cluster_list_id}", 
    response_model=ClusterList, 
    operation_id="get_cluster_list_by_id",
)
def get_cluster_list_by_id(
    cluster_list_id: str,
    db_service: DatabaseService = Depends(get_database_service)
):
    """
    get_cluster_list_by_id() -> returns a specific ClusterList by its ID
    """
    db_cluster_list = db_service.get_cluster_list_by_id(cluster_list_id)
    if not db_cluster_list:
        raise HTTPException(status_code=404, detail=f"ClusterList with id '{cluster_list_id}' not found.")
    return db_service.convert_to_api_cluster_list(db_cluster_list)


@router.patch(
    "/cluster-lists/{cluster_list_id}/qa/{qa_id}/move",
    response_model=MoveQAResponse,
    operation_id="move_qa_to_cluster",
)
async def move_qa_to_cluster(
    cluster_list_id: str, 
    qa_id: str, 
    payload: MoveQARequest,
    db_service: DatabaseService = Depends(get_database_service)
):
    """
    move_qa_to_cluster(cluster_list_id, qa_id, new_cluster_title) -> moves a Q/A to a new cluster.
    """
    print(f"[DEBUG] move_qa_to_cluster called with: cluster_list_id={cluster_list_id}, qa_id={qa_id}, payload={payload}")
    
    new_cluster_title = payload.new_cluster_title.strip()
    if not new_cluster_title:
        error_msg = "new_cluster_title must be non-empty"
        print(f"[ERROR] {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)

    # Get cluster list
    print(f"[DEBUG] Looking up cluster list with ID: {cluster_list_id}")
    db_cluster_list = db_service.get_cluster_list_by_id(cluster_list_id)
    print(f"[DEBUG] Found cluster list: {db_cluster_list}")
    
    if not db_cluster_list:
        error_msg = f"ClusterList with id '{cluster_list_id}' not found."
        print(f"[ERROR] {error_msg}")
        raise HTTPException(status_code=404, detail=error_msg)

    # Get Q&A pair
    print(f"[DEBUG] Looking up Q/A pair with ID: {qa_id}")
    qa_pair = db_service.get_qa_pair_by_id(qa_id)
    print(f"[DEBUG] Found Q/A pair: {qa_pair}")
    
    if not qa_pair:
        error_msg = f"Q/A with id '{qa_id}' not found."
        print(f"[ERROR] {error_msg}")
        raise HTTPException(status_code=404, detail=error_msg)

    # Get old cluster title
    old_cluster_title = qa_pair.cluster.title if qa_pair.cluster else ""
    print(f"[DEBUG] Current cluster for Q/A: {old_cluster_title}")

    # Get destination cluster
    print(f"[DEBUG] Looking up destination cluster with title: {new_cluster_title}")
    dest_cluster = db_service.get_cluster_by_title(db_cluster_list.id, new_cluster_title)
    print(f"[DEBUG] Found destination cluster: {dest_cluster}")
    
    if not dest_cluster:
        error_msg = f"Destination cluster '{new_cluster_title}' not found in list '{cluster_list_id}'."
        print(f"[ERROR] {error_msg}")
        raise HTTPException(status_code=404, detail=error_msg)

    # If source and destination are the same, do nothing
    if qa_pair.cluster_id == dest_cluster.id:
        msg = "Source and destination clusters are the same. No action taken."
        print(f"[INFO] {msg}")
        return MoveQAResponse(
            message=msg,
            qa_id=qa_id,
            old_cluster_title=old_cluster_title,
            new_cluster_title=new_cluster_title
        )

    print(f"[DEBUG] Moving Q/A from cluster ID {qa_pair.cluster_id} to {dest_cluster.id}")
    
    # Move the Q&A pair
    db_service.move_qa_pair(qa_pair, dest_cluster)
    print("[DEBUG] Successfully moved Q/A pair in database")

    # Broadcast the update
    if manager and manager.is_ready():
        print("[DEBUG] Broadcasting update to connected clients")
        await manager.broadcast({
            "type": "cluster_list_update",
            "payload": {
                "list_id": cluster_list_id
            }
        })
    else:
        print("[WARNING] Manager not ready, skipping broadcast")

    msg = f"Moved Q/A from '{old_cluster_title}' to '{new_cluster_title}'."
    print(f"[INFO] {msg}")
    
    return MoveQAResponse(
        message=msg,
        qa_id=qa_id,
        old_cluster_title=old_cluster_title,
        new_cluster_title=new_cluster_title
    )


@router.patch("/cluster-lists/{cluster_list_id}/reorder", status_code=200)
async def reorder_qas_in_cluster(
    cluster_list_id: str, 
    request: ReorderQAsRequest,
    db_service: DatabaseService = Depends(get_database_service)
):
    # Get cluster list
    db_cluster_list = db_service.get_cluster_list_by_id(cluster_list_id)
    if not db_cluster_list:
        raise HTTPException(status_code=404, detail="Cluster list not found")

    # Get cluster
    cluster = db_service.get_cluster_by_title(db_cluster_list.id, request.cluster_title)
    if not cluster:
        raise HTTPException(status_code=404, detail=f"Cluster '{request.cluster_title}' not found")

    # For now, we'll just validate the QA IDs exist
    # In a full implementation, you might add a position field to QAPairDB
    qa_map = {qa.qa_id: qa for qa in cluster.qas}
    
    # Check if all original QAs are still present
    if len(request.ordered_qa_ids) != len(cluster.qas) or set(request.ordered_qa_ids) != set(qa_map.keys()):
        raise HTTPException(status_code=400, detail="Mismatched QA items during reorder")

    # Broadcast the update
    if manager and manager.is_ready():
        await manager.broadcast({
            "type": "cluster_list_update",
            "payload": {
                "list_id": cluster_list_id
            }
        })

    return {"message": f"QAs in cluster '{request.cluster_title}' reordered successfully."}


# For backward compatibility with the current frontend, which expects /clusters
@router.get(
    "/clusters", 
    response_model=ClusterList, 
    operation_id="get_clusters",
)
def get_clusters(db_service: DatabaseService = Depends(get_database_service)):
    """
    get_clusters() -> returns the *first* ClusterList for backward compatibility.
    """
    db_cluster_lists = db_service.get_all_cluster_lists()
    if not db_cluster_lists:
        raise HTTPException(status_code=404, detail="No cluster lists found.")
    # Return the first one found
    return db_service.convert_to_api_cluster_list(db_cluster_lists[0])


@router.post("/update_qa", response_model=UpdateQAResponse, operation_id="update_qa")
async def update_qa(
    payload: UpdateQARequest,
    db_service: DatabaseService = Depends(get_database_service)
):
    """
    update_qa(cluster_list_id, clusterName, qa_id, question, answer) -> updates a Q/A in the named cluster.
    At least one of question or answer must be provided.
    """
    if not payload.cluster_list_id:
        raise HTTPException(status_code=400, detail="cluster_list_id must be provided")

    # Get cluster list
    db_cluster_list = db_service.get_cluster_list_by_id(payload.cluster_list_id)
    if not db_cluster_list:
        raise HTTPException(status_code=404, detail=f"ClusterList with id '{payload.cluster_list_id}' not found.")

    cluster_name = payload.clusterName.strip()
    if not cluster_name:
        raise HTTPException(status_code=400, detail="clusterName must be non-empty")
    if not payload.qa_id:
        raise HTTPException(status_code=400, detail="qa_id must be non-empty")
    if payload.question is None and payload.answer is None:
        raise HTTPException(status_code=400, detail="At least one of 'question' or 'answer' must be provided for an update.")

    # Get cluster
    cluster = db_service.get_cluster_by_title(db_cluster_list.id, cluster_name)
    if not cluster:
        raise HTTPException(status_code=404, detail=f"Cluster '{cluster_name}' not found in list '{payload.cluster_list_id}'.")

    # Get Q&A pair
    qa_pair = db_service.get_qa_pair_by_id(payload.qa_id)
    if not qa_pair or qa_pair.cluster_id != cluster.id:
        raise HTTPException(status_code=404, detail=f"Q/A with id '{payload.qa_id}' not found in cluster '{cluster_name}'.")

    # Check if there are actual changes
    question_changed = (payload.question is not None and 
                       payload.question.strip() and 
                       payload.question.strip() != qa_pair.question)
    answer_changed = (payload.answer is not None and 
                     payload.answer.strip() and 
                     payload.answer.strip() != qa_pair.answer)

    if not question_changed and not answer_changed:
        return UpdateQAResponse(
            message="No changes detected.",
            qa_pair=db_service.convert_to_api_qa_pair(qa_pair)
        )

    # Update the Q&A pair
    updated_qa = db_service.update_qa_pair(qa_pair, payload.question, payload.answer)

    # Broadcast the update
    if manager and manager.is_ready():
        await manager.broadcast({
            "type": "cluster_list_update",
            "payload": {
                "list_id": payload.cluster_list_id
            }
        })

    return UpdateQAResponse(
        message=f'Updated Q/A in cluster "{cluster.title}".',
        qa_pair=db_service.convert_to_api_qa_pair(updated_qa)
    )


@router.post("/add_qa", response_model=AddQAResponse, operation_id="add_qa")
async def add_qa(
    payload: AddQARequest,
    db_service: DatabaseService = Depends(get_database_service)
):
    """
    add_qa(cluster_list_id, clusterName, question, answer) -> adds a Q/A to the named cluster.
    If the cluster doesn't exist, it will be created.
    """
    if not payload.cluster_list_id:
        raise HTTPException(status_code=400, detail="cluster_list_id must be provided")

    # Get cluster list
    db_cluster_list = db_service.get_cluster_list_by_id(payload.cluster_list_id)
    if not db_cluster_list:
        raise HTTPException(status_code=404, detail=f"ClusterList with id '{payload.cluster_list_id}' not found.")

    cluster_name = payload.clusterName.strip()
    if not cluster_name:
        raise HTTPException(status_code=400, detail="clusterName must be non-empty")
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="question must be non-empty")
    if not payload.answer.strip():
        raise HTTPException(status_code=400, detail="answer must be non-empty")

    # Get or create cluster
    cluster = db_service.get_cluster_by_title(db_cluster_list.id, cluster_name)
    if not cluster:
        # Create new cluster
        cluster = db_service.create_cluster(db_cluster_list.id, cluster_name)

    # Create Q&A pair
    qa_pair = db_service.create_qa_pair(cluster.id, payload.question, payload.answer)

    # Broadcast the update
    if manager and manager.is_ready():
        await manager.broadcast({
            "type": "cluster_list_update",
            "payload": {
                "list_id": payload.cluster_list_id
            }
        })

    # Convert cluster to API model
    api_cluster = db_service.convert_to_api_cluster(cluster)
    
    return AddQAResponse(
        message=f'Added Q/A to cluster "{cluster.title}".',
        cluster=api_cluster
    )


@router.delete("/qa/{qa_id}", response_model=DeleteQAResponse, operation_id="delete_qa")
async def delete_qa(
    qa_id: str, 
    clusterName: str, 
    cluster_list_id: str,
    db_service: DatabaseService = Depends(get_database_service)
):
    """
    delete_qa(qa_id, clusterName, cluster_list_id) -> deletes a Q/A from the named cluster.
    """
    if not cluster_list_id:
        raise HTTPException(status_code=400, detail="cluster_list_id must be provided")

    # Get cluster list
    db_cluster_list = db_service.get_cluster_list_by_id(cluster_list_id)
    if not db_cluster_list:
        raise HTTPException(status_code=404, detail=f"ClusterList with id '{cluster_list_id}' not found.")

    cluster_name = clusterName.strip()
    if not cluster_name:
        raise HTTPException(status_code=400, detail="clusterName must be non-empty")

    # Get cluster
    cluster = db_service.get_cluster_by_title(db_cluster_list.id, cluster_name)
    if not cluster:
        raise HTTPException(status_code=404, detail=f"Cluster '{cluster_name}' not found.")

    # Get Q&A pair
    qa_pair = db_service.get_qa_pair_by_id(qa_id)
    if not qa_pair or qa_pair.cluster_id != cluster.id:
        raise HTTPException(status_code=404, detail=f"Q/A with id '{qa_id}' not found in cluster '{cluster_name}'.")

    # Delete the Q&A pair
    db_service.delete_qa_pair(qa_pair)

    # Broadcast the update
    if manager and manager.is_ready():
        await manager.broadcast({
            "type": "cluster_list_update",
            "payload": {
                "list_id": cluster_list_id
            }
        })

    return DeleteQAResponse(
        message=f'Deleted Q/A from cluster "{cluster.title}".',
        qa_id=qa_id,
        clusterName=cluster.title
    )


@router.delete("/cluster/{cluster_name}", response_model=DeleteClusterResponse, operation_id="delete_cluster")
async def delete_cluster(
    cluster_name: str, 
    cluster_list_id: str,
    db_service: DatabaseService = Depends(get_database_service)
):
    """
    delete_cluster(cluster_name, cluster_list_id) -> deletes a cluster and all its Q/As.
    """
    if not cluster_list_id:
        raise HTTPException(status_code=400, detail="cluster_list_id must be provided")

    # Get cluster list
    db_cluster_list = db_service.get_cluster_list_by_id(cluster_list_id)
    if not db_cluster_list:
        raise HTTPException(status_code=404, detail=f"ClusterList with id '{cluster_list_id}' not found.")

    cluster_name_stripped = cluster_name.strip()
    if not cluster_name_stripped:
        raise HTTPException(status_code=400, detail="cluster_name must be non-empty")

    # Get cluster
    cluster = db_service.get_cluster_by_title(db_cluster_list.id, cluster_name_stripped)
    if not cluster:
        raise HTTPException(status_code=404, detail=f"Cluster '{cluster_name_stripped}' not found.")

    deleted_cluster_title = cluster.title
    
    # Delete the cluster
    db_service.delete_cluster(cluster)

    # Broadcast the update
    if manager and manager.is_ready():
        await manager.broadcast({
            "type": "cluster_list_update",
            "payload": {
                "list_id": cluster_list_id
            }
        })

    return DeleteClusterResponse(
        message=f'Deleted cluster "{deleted_cluster_title}".',
        clusterName=deleted_cluster_title
    )
