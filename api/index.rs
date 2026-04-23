use rustapi::create_app;
use vercel_runtime::{run, service_fn, Error, Request, Response, ResponseBody};
use tower::ServiceExt;
use axum::body::Body as AxumBody;
use http_body_util::BodyExt;
use tokio::sync::OnceCell;
use axum::Router;

static APP: OnceCell<Router> = OnceCell::const_new();

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(service_fn(handler)).await
}

pub async fn handler(req: Request) -> Result<Response<ResponseBody>, Error> {
    let app = APP.get_or_init(|| async {
        create_app().await
    }).await;

    // 1. Convert Vercel Request (hyper::body::Incoming) to bytes first
    let (parts, body) = req.into_parts();
    let collected = body.collect().await
        .map_err(|e| Error::from(e.to_string()))?;
    let bytes = collected.to_bytes();

    // 2. Create Axum-compatible request from the bytes
    let axum_req = axum::http::Request::from_parts(parts, AxumBody::from(bytes));

    // 3. Process request with the Axum router
    let response = app.clone().oneshot(axum_req).await
        .map_err(|e| Error::from(e.to_string()))?;

    // 4. Convert the Axum response back to a Vercel response
    let (parts, axum_body) = response.into_parts();
    let response_bytes = axum::body::to_bytes(axum_body, usize::MAX).await
        .map_err(|e| Error::from(e.to_string()))?;

    // 5. Build the Vercel Response using ResponseBody::from() 
    //    (matching the pattern used in vercel_runtime's own source code)
    let body_str = String::from_utf8_lossy(&response_bytes).to_string();
    let vercel_response = Response::builder()
        .status(parts.status)
        .body(ResponseBody::from(body_str))
        .map_err(|e| Error::from(e.to_string()))?;

    // Copy headers from axum response to vercel response
    let (mut resp_parts, resp_body) = vercel_response.into_parts();
    resp_parts.headers = parts.headers;
    let vercel_response = Response::from_parts(resp_parts, resp_body);

    Ok(vercel_response)
}
