from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import uuid4
from datetime import datetime


class QAPair(BaseModel):
    qa_id: str = Field(alias='_id')
    question: str
    answer: str
    created_at: Optional[str] = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class Cluster(BaseModel):
    title: str
    qas: List[QAPair] = Field(default_factory=list)


class ClusterList(BaseModel):
    id: str
    title: str
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


class ClusterListInfo(BaseModel):
    id: str
    title: str


class MoveQARequest(BaseModel):
    new_cluster_title: str


class MoveQAResponse(BaseModel):
    message: str
    qa_id: str
    old_cluster_title: str
    new_cluster_title: str


class ReorderQAsRequest(BaseModel):
    cluster_title: str
    ordered_qa_ids: List[str]


class CreateClusterListRequest(BaseModel):
    title: str


class DeleteQAResponse(BaseModel):
    message: str
    qa_id: str
    clusterName: str


class DeleteClusterResponse(BaseModel):
    message: str
    clusterName: str
