from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import uploads, imports, jobs

app = FastAPI(title="Tesla Light Show API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(uploads.router, prefix="/api/uploads", tags=["uploads"])
app.include_router(imports.router, prefix="/api/imports", tags=["imports"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
