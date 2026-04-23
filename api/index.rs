use rustapi::create_app;
use vercel_runtime::{run, service_fn, Body as VercelBody, Error, Request, Response as VercelResponse};
use tower::ServiceExt;
use axum::body::Body as AxumBody;
use tokio::sync::OnceCell;
use axum::Router;

static APP: OnceCell<Router> = OnceCell::const_new();

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(service_fn(handler)).await
}

pub async fn handler(req: Request) -> Result<VercelResponse<VercelBody>, Error> {
    let app = APP.get_or_init(|| async {
        create_app().await
    }).await;

    // Convert Vercel Request to Axum Request
    let (parts, body) = req.into_parts();
    let axum_req = axum::http::Request::from_parts(parts, AxumBody::from(body));

    // Process request with Axum
    let response = app.clone().oneshot(axum_req).await?;

    // Convert Axum Response to Vercel Response
    let (parts, body) = response.into_parts();
    
    // Axum 0.7 uses axum::body::Body which can be converted to bytes
    let bytes = axum::body::to_bytes(body, usize::MAX).await?;
    let vercel_res = VercelResponse::from_parts(parts, VercelBody::Binary(bytes.to_vec()));

    Ok(vercel_res)
}
