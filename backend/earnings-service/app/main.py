from fastapi import FastAPI

app = FastAPI(title="earnings-service")


@app.get("/")
def startup_route():
    return {
        "service": "earnings-service",
        "status": "ok",
        "message": "Simple startup route"
    }
