from fastapi import FastAPI

app = FastAPI(title="auth-service")


@app.get("/")
def startup_route():
    return {
        "service": "auth-service",
        "status": "ok",
        "message": "Simple startup route"
    }
