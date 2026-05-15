const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeRouteParam(v?: string | string[]): string | null {
  if (v == null) return null;
  const s = (Array.isArray(v) ? v[0] : v).trim();
  return s || null;
}

export function isUserUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Id podopiecznego z trasy (dependent / add-treatment / add-med).
 * Nie używa gołego `id` z globalnych params — mogą pochodzić z innego ekranu.
 */
export function resolveMedsTargetUserId(
  params: { id?: string | string[]; dependentId?: string | string[] },
  segments: string[],
): string | null {
  const dependentId = normalizeRouteParam(params.dependentId);
  if (dependentId && isUserUuid(dependentId)) return dependentId;

  const depIdx = segments.indexOf('dependent');
  if (depIdx >= 0) {
    const segId = segments[depIdx + 1];
    if (segId && isUserUuid(segId)) return segId;
  }

  for (const marker of ['add-treatment', 'add-med', 'edit-treatment']) {
    const i = segments.indexOf(marker);
    if (i >= 0) {
      const segId = segments[i + 1];
      if (segId && isUserUuid(segId)) return segId;
    }
  }

  const routeId = normalizeRouteParam(params.id);
  if (routeId && isUserUuid(routeId) && segments.includes('dependent')) {
    return routeId;
  }

  return null;
}

/** ID podopiecznego na ekranach add-treatment / add-med (parametry + segmenty + kontekst). */
export function pickDependentUserId(sources: {
  localDependentId?: string | string[];
  localId?: string | string[];
  globalDependentId?: string | string[];
  globalId?: string | string[];
  segments: string[];
  contextUserId?: string | null;
}): string | null {
  const candidates: (string | null)[] = [
    sources.contextUserId ?? null,
    normalizeRouteParam(sources.localId),
    normalizeRouteParam(sources.localDependentId),
    normalizeRouteParam(sources.globalId),
    normalizeRouteParam(sources.globalDependentId),
    resolveMedsTargetUserId(
      {
        id: sources.globalId ?? sources.localId,
        dependentId:
          sources.globalDependentId ?? sources.localDependentId,
      },
      sources.segments,
    ),
  ];
  for (const c of candidates) {
    if (c && isUserUuid(c)) return c;
  }
  return null;
}
