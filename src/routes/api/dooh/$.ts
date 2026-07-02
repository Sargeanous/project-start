import { createFileRoute } from "@tanstack/react-router";
import {
  broadcastEmergencyNow,
  createAlert,
  createSubmission,
  decideFinanceApproval,
  getState,
  markAllNotificationsRead,
  markNotificationRead,
  placeBid,
  playScheduleItem,
  queueEmergencyBroadcast,
  resetEmergencyAlert,
  resetState,
  requestSubmissionChanges,
  runEmergencyChecks,
  updateSubmissionStage,
  type AlertDraft,
  type BriefPayload,
} from "../../../backend/dooh-store";

type RouteBody = Record<string, unknown>;

export const Route = createFileRoute("/api/dooh/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const segments = splitPath(params._splat);
        if (segments[0] === "state") return Response.json(await getState());
        return jsonError("Unknown DOOH endpoint", 404);
      },
      POST: async ({ request, params }) => {
        try {
          const segments = splitPath(params._splat);
          const body = (await request.json().catch(() => ({}))) as RouteBody;
          const actor = stringValue(body.actor, "System");

          if (segments[0] === "reset") {
            return Response.json({ state: await resetState() });
          }

          if (segments[0] === "notifications" && segments[1] === "read-all") {
            const profileId = stringValue(body.profileId, "");
            if (!profileId) return jsonError("Profile is required", 422);
            return Response.json({ state: await markAllNotificationsRead(profileId as never) });
          }

          if (segments[0] === "notifications" && segments[2] === "read") {
            const profileId = stringValue(body.profileId, "");
            if (!profileId) return jsonError("Profile is required", 422);
            return Response.json({ state: await markNotificationRead(segments[1], profileId as never) });
          }

          if (segments[0] === "submissions" && segments.length === 1) {
            const payload = body.payload as BriefPayload | undefined;
            if (!payload?.campaign?.trim()) return jsonError("Campaign name is required", 422);
            return Response.json(await createSubmission(payload, actor));
          }

          if (segments[0] === "submissions" && segments[2] === "stage") {
            const stage = stringValue(body.stage, "");
            if (!stage) return jsonError("Stage is required", 422);
            return Response.json(await updateSubmissionStage(segments[1], stage as never, actor));
          }

          if (segments[0] === "submissions" && segments[2] === "request-changes") {
            const message = stringValue(body.message, "");
            if (!message) return jsonError("Revision message is required", 422);
            return Response.json(await requestSubmissionChanges(segments[1], message, actor));
          }

          if (segments[0] === "bids") {
            const payload = body.payload as { lotId?: string; amount?: number; campaign?: string } | undefined;
            if (!payload?.lotId || !payload.campaign || typeof payload.amount !== "number") {
              return jsonError("Lot, campaign and amount are required", 422);
            }
            return Response.json(await placeBid({ lotId: payload.lotId, campaign: payload.campaign, amount: payload.amount }, actor));
          }

          if (segments[0] === "schedule" && segments[2] === "play") {
            return Response.json({ state: await playScheduleItem(segments[1], actor) });
          }

          if (segments[0] === "alerts" && segments.length === 1) {
            const payload = body.payload as AlertDraft | undefined;
            if (!payload?.title?.trim()) return jsonError("Alert title is required", 422);
            return Response.json(await createAlert(payload, actor));
          }

          if (segments[0] === "alerts" && segments[2] === "checks") {
            return Response.json({ state: await runEmergencyChecks(segments[1], actor) });
          }

          if (segments[0] === "alerts" && segments[2] === "queue") {
            return Response.json({ state: await queueEmergencyBroadcast(segments[1], actor) });
          }

          if (segments[0] === "alerts" && segments[2] === "broadcast") {
            return Response.json({ state: await broadcastEmergencyNow(segments[1], actor) });
          }

          if (segments[0] === "alerts" && segments[2] === "reset") {
            return Response.json({ state: await resetEmergencyAlert(segments[1], actor) });
          }

          if (segments[0] === "finance" && segments[2] === "decision") {
            const decision = stringValue(body.state, "");
            if (!decision) return jsonError("Decision is required", 422);
            return Response.json({ state: await decideFinanceApproval(segments[1], decision as never, actor) });
          }

          return jsonError("Unknown DOOH endpoint", 404);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unexpected backend error";
          return jsonError(message, 400);
        }
      },
    },
  },
});

function splitPath(path: string | undefined) {
  return (path ?? "").split("/").filter(Boolean);
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
