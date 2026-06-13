from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from hireable.config import settings
from hireable.database import init_db
from hireable.routers import cv, lessons, progress, roadmap


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Hireable API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cv.router)
app.include_router(roadmap.router)
app.include_router(lessons.router)
app.include_router(progress.router)


@app.get("/health")
def health():
    return {"status": "ok", "model": settings.default_model}
