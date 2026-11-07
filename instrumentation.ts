import type { Instrumentation } from "next";
import { logAppError } from "@/lib/error-logging";

export const onRequestError: Instrumentation.onRequestError = (error, _request, context) => {
  logAppError("server.request", error, { route: context.routePath, routeType: context.routeType });
};
