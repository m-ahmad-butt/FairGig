from fastapi import FastAPI

app = FastAPI(title="anomaly-service")


@app.get("/")
def startup_route():
    return {
        "service": "anomaly-service",
        "status": "ok",
        "message": "Simple startup route"
    }
