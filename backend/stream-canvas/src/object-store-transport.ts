import { AsyncLocalStorage } from "node:async_hooks";
import * as http from "node:http";
import * as https from "node:https";
import { Readable } from "node:stream";
import { urlToHttpOptions } from "node:url";

/** A deadline shared by every request/retry belonging to one S3 operation. */
export class ObjectStoreTransport {
  private readonly operations = new AsyncLocalStorage<AbortSignal>();
  readonly transport: Pick<typeof http, "request">;

  constructor(secure: boolean) {
    const native = secure ? https : http;
    const operations = this.operations;
    function request(
      options: string | URL | http.RequestOptions,
      callback?: (response: http.IncomingMessage) => void,
    ): http.ClientRequest;
    function request(
      url: string | URL,
      options: http.RequestOptions,
      callback?: (response: http.IncomingMessage) => void,
    ): http.ClientRequest;
    function request(
      first: string | URL | http.RequestOptions,
      second?: http.RequestOptions | ((response: http.IncomingMessage) => void),
      third?: (response: http.IncomingMessage) => void,
    ): http.ClientRequest {
      const signal = operations.getStore();
      const callback = typeof second === "function" ? second : third;
      const options =
        typeof first === "string" || first instanceof URL
          ? {
              ...urlToHttpOptions(new URL(first)),
              ...(typeof second === "object" ? second : {}),
            }
          : first;
      const req = native.request({ ...options, signal }, (response) => {
        // Cancellation can happen before the consumer attaches its listeners.
        response.on("error", () => {});
        callback?.(response);
      });
      // Node's signal destroys the request and its response, including streams
      // already returned to the caller. It also cancels connection establishment.
      return req;
    }
    this.transport = { request };
  }

  async run<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref();
    let streaming = false;
    try {
      return await this.operations.run(controller.signal, async () => {
        const result = await operation();
        if (
          result instanceof Readable &&
          !result.destroyed &&
          !result.readableEnded
        ) {
          streaming = true;
          const clear = () => clearTimeout(timer);
          result.once("end", clear);
          result.once("close", clear);
          result.once("error", clear);
        }
        return result;
      });
    } finally {
      if (!streaming) {
        clearTimeout(timer);
        // Minio can reject an HTTP status without consuming its response body.
        controller.abort();
      }
    }
  }
}
