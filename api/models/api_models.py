from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import uuid4
from datetime import datetime


# Source Note Models (defined first since they're referenced in QAPair)
class SourceMetadata(BaseModel):
    title: str
    url: Optional[str] = None
    author: Optional[str] = None
    publication_date: Optional[str] = None
    source_type: str  # 'book' | 'article' | 'pdf' | 'video' | 'website' | 'other'


class SourceContent(BaseModel):
    summary: str
    key_takeaways: List[str] = Field(default_factory=list)
    personal_notes: str = Field(default="")
    tags: List[str] = Field(default_factory=list)


class QAPair(BaseModel):
    qa_id: str = Field(..., alias='_id')
    question: str
    answer: str
    created_at: Optional[str] = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    card_type: Optional[str] = Field(default="qa")
    # Source note specific fields
    source_metadata: Optional[SourceMetadata] = None
    source_content: Optional[SourceContent] = None

    class Config:
        populate_by_name = True


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


class DeleteClusterListResponse(BaseModel):
    message: str
    clusterListId: str
    clusterListTitle: str


class SourceNote(BaseModel):
    source_note_id: str = Field(..., alias='_id')
    source_metadata: Optional[SourceMetadata] = None
    source_content: Optional[SourceContent] = None
    created_at: Optional[str] = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    card_type: str = Field(default="source_note")

    class Config:
        populate_by_name = True


class AddSourceNoteRequest(BaseModel):
    cluster_list_id: str
    cluster_name: str
    source_metadata: SourceMetadata
    source_content: SourceContent


class AddSourceNoteResponse(BaseModel):
    message: str
    source_note: SourceNote


class UpdateSourceNoteRequest(BaseModel):
    cluster_list_id: str
    cluster_name: str
    source_metadata: Optional[SourceMetadata] = None
    source_content: Optional[SourceContent] = None


class UpdateSourceNoteResponse(BaseModel):
    message: str
    source_note: SourceNote


class DeleteSourceNoteResponse(BaseModel):
    message: str
    source_note_id: str
    cluster_name: str
