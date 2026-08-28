export type ResponseMeta = {
  correlationId?: string;
  tenantId?: string;
  requestId: string;
  timestamp: string;
};

export type SuccessEnvelope<TData> = {
  data: TData;
  meta: ResponseMeta;
  success: true;
};

export type ErrorEnvelope<TDetails = unknown> = {
  error: {
    code: string;
    details?: TDetails;
    message: string;
  };
  meta: ResponseMeta;
  success: false;
};

export type ApiEnvelope<TData, TDetails = unknown> =
  SuccessEnvelope<TData> | ErrorEnvelope<TDetails>;

export function createMeta(
  requestId: string,
  tenantId?: string,
  correlationId?: string
): ResponseMeta {
  const meta: ResponseMeta = {
    requestId,
    timestamp: new Date().toISOString()
  };

  if (tenantId) {
    meta.tenantId = tenantId;
  }

  if (correlationId) {
    meta.correlationId = correlationId;
  }

  return meta;
}

export function ok<TData>(
  data: TData,
  input: {
    correlationId?: string;
    tenantId?: string;
    requestId: string;
  }
): SuccessEnvelope<TData> {
  return {
    data,
    meta: createMeta(input.requestId, input.tenantId, input.correlationId),
    success: true
  };
}

export function fail<TDetails>(
  error: {
    code: string;
    details?: TDetails;
    message: string;
  },
  input: {
    correlationId?: string;
    tenantId?: string;
    requestId: string;
  }
): ErrorEnvelope<TDetails> {
  return {
    error,
    meta: createMeta(input.requestId, input.tenantId, input.correlationId),
    success: false
  };
}
