use rustapi::create_app;
use vercel_runtime::{run, service_fn, Error, Request, Response};
use tower::ServiceExt;
use axum::body::{Body as AxumBody, to_bytes};
use tokio::sync::OnceCell;
use axum::Router;

static APP: OnceCell<Router> = OnceCell::const_new();

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(service_fn(handler)).await
}

pub async fn handler(req: Request) -> Result<Response, Error> {
    let app = APP.get_or_init(|| async {
        create_app().await
    }).await;

    // Convert Vercel Request to Axum Request
    // Note: Request is likely http::Request<vercel_runtime::Body>
    let (parts, body) = req.into_parts();
    // Vercel Body can be converted to Axum Body
    let axum_req = axum::http::Request::from_parts(parts, AxumBody::from(body));

    // Process request with Axum
    let response = app.clone().oneshot(axum_req).await
        .map_err(|e| Error::from(e.to_string()))?;

    // Convert Axum Response to Vercel Response
    let (parts, body) = response.into_parts();
    
    // Convert Axum Body to Bytes
    let bytes = to_bytes(body, usize::MAX).await
        .map_err(|e| Error::from(e.to_string()))?;
        
    // Construct Vercel Response
    let vercel_res = Response::builder()
        .status(parts.status)
        .body(bytes.to_vec().into())
        .map_err(|e| Error::from(e.to_string()))?;

    Ok(vercel_res)
}
