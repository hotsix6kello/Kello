import {
  getSupportedTranslationLocaleListLabel,
  isSupportedTranslationLocale,
} from "../translation/config.ts";
import { normalizeInterpreterTextInput } from "./interpreterUi.ts";
import type { InterpreterSessionRequest, InterpreterTurnRequest } from "./types.ts";

type SessionRouteService = {
  createSession: (request: InterpreterSessionRequest) => Promise<unknown>;
};

type TurnRouteService = {
  translateTurn: (request: InterpreterTurnRequest) => Promise<unknown>;
};

type SttRouteService = {
  transcribe: (request: {
    language: InterpreterSessionRequest["customerLocale"];
    audioBuffer: Uint8Array;
    mimeType: string;
  }) => Promise<unknown>;
};

interface RouteResult<TBody = unknown> {
  status: number;
  body: TBody;
}

const SUPPORTED_LOCALE_LIST_LABEL = getSupportedTranslationLocaleListLabel();

export async function processInterpreterSessionPost(
  request: Request,
  routeService: SessionRouteService,
): Promise<RouteResult> {
  try {
    const body = (await request.json()) as Partial<InterpreterSessionRequest>;

    if (!body.customerLocale || !body.staffLocale) {
      return {
        status: 400,
        body: { error: "customerLocale and staffLocale are required" },
      };
    }

    if (!isSupportedTranslationLocale(body.customerLocale) || !isSupportedTranslationLocale(body.staffLocale)) {
      return {
        status: 400,
        body: { error: `customerLocale and staffLocale must be one of ${SUPPORTED_LOCALE_LIST_LABEL}` },
      };
    }

    return {
      status: 200,
      body: await routeService.createSession({
        customerLocale: body.customerLocale,
        staffLocale: body.staffLocale,
      }),
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: error instanceof Error ? error.message : "interpreter_session_failed" },
    };
  }
}

export async function processInterpreterTurnPost(
  request: Request,
  routeService: TurnRouteService,
): Promise<RouteResult> {
  try {
    const body = (await request.json()) as Partial<InterpreterTurnRequest>;
    const normalizedText = typeof body.text === "string" ? normalizeInterpreterTextInput(body.text) : null;

    if (!body.sessionId || !body.ephemeralToken || !body.speaker || !body.inputMode) {
      return {
        status: 400,
        body: { error: "sessionId, ephemeralToken, speaker, inputMode, text are required" },
      };
    }

    if (!normalizedText) {
      return {
        status: 400,
        body: { error: "text must not be empty" },
      };
    }

    return {
      status: 200,
      body: await routeService.translateTurn({
        sessionId: body.sessionId,
        ephemeralToken: body.ephemeralToken,
        speaker: body.speaker,
        inputMode: body.inputMode,
        text: normalizedText,
      }),
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: error instanceof Error ? error.message : "interpreter_turn_failed" },
    };
  }
}

export async function processInterpreterSttPost(
  request: Request,
  routeService: SttRouteService,
): Promise<RouteResult> {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const language = formData.get("language");

    if (!(audio instanceof File)) {
      return {
        status: 400,
        body: { error: "audio file is required" },
      };
    }

    if (typeof language !== "string" || !isSupportedTranslationLocale(language)) {
      return {
        status: 400,
        body: { error: `language must be one of ${SUPPORTED_LOCALE_LIST_LABEL}` },
      };
    }

    const arrayBuffer = await audio.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return {
        status: 400,
        body: { error: "audio payload is empty" },
      };
    }

    return {
      status: 200,
      body: await routeService.transcribe({
        language,
        audioBuffer: new Uint8Array(arrayBuffer),
        mimeType: audio.type || "audio/webm",
      }),
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: error instanceof Error ? error.message : "interpreter_stt_failed" },
    };
  }
}
